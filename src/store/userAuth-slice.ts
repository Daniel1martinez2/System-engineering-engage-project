import { createSlice, Dispatch, AnyAction } from "@reduxjs/toolkit";
import { StudentType, TeacherType, isStudentType, userMessage } from "../types/user";
import { Firestore, getDoc, deleteDoc } from "firebase/firestore";
import { setUserDataFromObj } from "../utils/firebase-functions/setUserDataFromObj";
import {
  signInWithEmailAndPassword,
  Auth,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
} from "firebase/auth";
import { setDoc, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getCurrentUser } from "../utils/firebase-functions/getCurrentUser";
import classSlice from './class-slice';

// * Initial state Type
export type userAuthInitStateType = {
  isLoggedIn: boolean;
  user: null | TeacherType | StudentType;
  isFetchingCurrentUser: boolean;
};

const initialState: userAuthInitStateType = {
  isLoggedIn: false,
  user: null,
  isFetchingCurrentUser: true,
};

// * The Slice
const userLoginSlice = createSlice({
  name: "userAuth",
  initialState,
  reducers: {
    login(state, action) {
      state.isLoggedIn = action.payload.user ? true : false;
      state.user = action.payload.user;
    },
    logout(state) {
      state.isLoggedIn = false;
      state.user = null;
    },
    updateStudent(state, action) {
      state.user = action.payload.user
    },
    setFetchingCurrentUserState(state, action) {
      state.isFetchingCurrentUser = action.payload.state;
    },
  },
});

export const updateStudentAsync = (db: Firestore, userId: string) => {
  return async (dispatch: Dispatch<AnyAction>) => {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    const currentUserData = docSnap.data();
    if (currentUserData === undefined) return;
    dispatch(userLoginSlice.actions.updateStudent({
      user:  setUserDataFromObj(currentUserData),
    }))
  }
}

// * Login user from firebase Auth method
export const logUserAsync = (
  auth: Auth,
  db: Firestore,
  email: string,
  password: string,
  callback?: Function,
  errorCallback?: (errorCode:string, errorMessage:string) => void
) => {
  return async (dispatch: Dispatch<AnyAction>) => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        getCurrentUser(userCredential.user.uid, db).then((currentUser) => {
          const currentUserData = currentUser.data();
          if (currentUserData === undefined) return;
          dispatch(
            userLoginSlice.actions.login({
              user: setUserDataFromObj(currentUserData),
            })
          );
          if (callback) callback();
        });
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        if(errorCallback) errorCallback(errorCode, errorMessage);
      });
  };
};

// * Setting up current auth state, wether there is a current session or not
export const setOnAuthState = (auth: Auth, db: Firestore) => {
  return async (dispatch: Dispatch<AnyAction>) => {
    onAuthStateChanged(auth, (user) => {
      dispatch(userLoginSlice.actions.setFetchingCurrentUserState({ state: true }));
      if (user) {
        // User is signed in, see docs for a list of available properties
        getCurrentUser(user.uid, db)
          .then((currentUserDoc) => {
            const docData = currentUserDoc.data();
            if (docData === undefined) return;
            dispatch(
              userLoginSlice.actions.login({
                user: setUserDataFromObj(docData),
              })
            );
          })
          .catch((error) => {
            console.log(error.code, error.message, Object.keys(error));
          });
      } else {
        // User is signed out
        dispatch(userLoginSlice.actions.login({ user: null }));
        console.log("There is no user");
        dispatch(userLoginSlice.actions.setFetchingCurrentUserState({ state: false }));
      }
    });
  };
};

// * Login out from Firebase Auth, and updating the userAuth State by setting the dispatch
export const logOutUser = (auth: Auth, callback?: Function) => {
  return async (dispatch: Dispatch<AnyAction>) => {
    signOut(auth)
      .then(() => {
        // Sign-out successful.
        console.log("Congrats, sign out successful");
        dispatch(userLoginSlice.actions.logout());
        dispatch(classSlice.actions.clearData());
        if (callback) callback();
      })
      .catch((error) => {
        // An error happened.
        console.log("Error during sign-out", error);
      });
  };
};

export const deleteUserByUID = (db: Firestore, userId: string, classId: string, callback?: Function) => {
  return async (dispatch: Dispatch<AnyAction>) => {
    const authUser = getAuth();
    const user = authUser.currentUser;
    console.log("USER-->", user)
    if(!user) return
    deleteUser(user)
      .then(() => {
        const docRef = doc(db, "users", userId);
        dispatch(userLoginSlice.actions.logout());
        deleteDoc(docRef)

        updateDoc(doc(db, `classes/${classId}`), { studentsId:  arrayRemove(userId)}).then(
          () => {
            if(callback) callback();
          }
        );
      })
      .catch((error) => {
        // An error happened.
        console.log("Error during sign-out", error);
      });
  };
};

export const addNewUserToFirestore = (
  db: Firestore,
  userData: TeacherType | StudentType,
  auth: Auth,
  callback: Function,
  email: string,
  password: string,
  errorCallback?: (e: any) => void
) => {
  return async (dispatch: Dispatch<AnyAction>) => {
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log(user, user.uid);
        setDoc(doc(db, "users", user.uid), { ...userData, id: user.uid })
          .then(() => {
            if(userData.role === 'student' && isStudentType(userData)){
              updateDoc(doc(db, "classes", userData.belongedClassId), {
                studentsId: arrayUnion(user.uid)
              })
            }
            console.log("User has been created successfully");
            callback();
          })
      })
      .catch((error) => {
        if(errorCallback) errorCallback(error);
      });
  };
};

export const deleteUserMessage = (db: Firestore, userID: string, message:userMessage,  callback?: Function) => {
  return async (dispatch: Dispatch<AnyAction>) => {
    updateDoc(doc(db, "users", userID), {
      messages: arrayRemove(message)
    })
      .then(() => {
        if(callback) callback();
      })
      .catch((error) => {
        console.log(error);
      })
  };
};

export default userLoginSlice;
