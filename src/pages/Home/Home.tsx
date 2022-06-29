import React, { useEffect } from 'react';
import { isTeacherType } from "../../types/user";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { userAuthInitStateType } from '../../store/userAuth-slice';
import TeacherView from '../TeacherView/TeacherView';
// import { db, auth } from '../../utils/firebase-functions/getFirebaseInit';

const Home = () => {
  const loggedUser = useSelector((state: {userAuth: userAuthInitStateType}) => state?.userAuth.user);
  const isFetchingCurrentUser = useSelector((state: {userAuth: userAuthInitStateType}) => state?.userAuth.isFetchingCurrentUser);
  const isLoggedIn = useSelector((state: {userAuth: userAuthInitStateType}) => state?.userAuth.isLoggedIn);
  const navigate = useNavigate();
  // const dispatch = useDispatch();
  
  

  useEffect(() => {
    if(!isFetchingCurrentUser){
      console.log('AAA', isLoggedIn)
      // * At this moment, the fetch process is finished
      // TODO: Check if there is a user login
      if(!isLoggedIn){
        navigate("/login");
      }  
    }

    if(loggedUser?.role === 'teacher' && isTeacherType(loggedUser)){
      console.log('TEACHEEER', loggedUser.isVerified);
      if(!loggedUser.isVerified){
        navigate("/teacher-pending");
      }
    }
  }, [isFetchingCurrentUser, isLoggedIn, loggedUser, navigate]);

  return (
    <div>
      {(loggedUser?.role === 'teacher' && isTeacherType(loggedUser)) ? 
        <TeacherView teacherUser={loggedUser}/> :
        <>
          <p>{loggedUser?.name}</p>
        </>
      }
    </div>
  )
}

export default Home