import React, { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../utils/firebase-functions/getFirebaseInit';
import LogOut from '../../components/LogOut/LogOut';
import { StudentType } from "../../types/user";
import StudentInfo from '../../components/StudentInfo/StudentInfo';
import { useSelector, useDispatch } from "react-redux";
import { InitialStateType } from '../../store/class-slice';
import Progress from '../../components/Progress/Progress';
import MessageModal from '../../components/MessageModal/MessageModal';
import Modal from '../../components/Modal/Modal';
import MainBtn from '../../components/MainBtn/MainBtn';
import styles from './StudentView.module.css';
import {deleteUserMessage, deleteUserByUID} from '../../store/userAuth-slice';
import SelectDropDown from '../../components/SelectDropDown/SelectDropDown';
import { getStudentsFromClass } from '../../utils/firebase-functions/getStudentsFromClass';
import UserThumbNail from '../../components/UserThumbNail/UserThumbNail';
import SenpaiActions from '../../components/SenpaiActions/SenpaiActions';
import { getSenpaiStudents } from '../../utils/firebase-functions/getSenpaiActionsStudents';
import ProgressBar from '../../components/ProgressBar/ProgressBar';
import Arrow from '../../components/UI/Arrow/Arrow';
import LoaderLine from '../../components/LoaderLine/LoaderLine';
import { Link, useNavigate } from 'react-router-dom';
import {setUsersSortByTopic, getUserTopicPoints} from '../../utils/handleSortByTopic';

interface StudentViewInterface {
  studentUser: StudentType
}

const StudentView: React.FC<StudentViewInterface> = ({studentUser}) => {
  const userClasses = useSelector((state: {classSlice: InitialStateType}) => state?.classSlice.userClasses)[0];
  const [currentTopicRanking, setCurrentTopicRanking] = useState('General');
  const [classUsers, setClassUsers] = useState<StudentType[]>([]);
  const [senpaiStudents, setsenpaiStudents] = useState<StudentType[]>([]);
  const [loadingApprentices, setLoadingApprentices] = useState(false);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [activeMessages, setActiveMessages] = useState(studentUser.messages.length > 0);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectDropdownRef = useRef<any>();
  let position = 1
  
  const handleCloseMessageModal = () => {
    dispatch(deleteUserMessage(db, studentUser.id, studentUser.messages[0], () => {
      setActiveMessages(false);
    }))
  }

  const handleSetTopicRanking = (topic: string) => {
    setLoadingRankings(true);
    setCurrentTopicRanking(topic);
    setClassUsers(prev => setUsersSortByTopic(prev, topic));
    selectDropdownRef.current.close();
    setLoadingRankings(false);
  }
  
  useEffect(() => {
    if(!userClasses) return
    setLoadingRankings(true);
    getStudentsFromClass(db, userClasses.classId)
    .then(usersData => {
      setLoadingRankings(false);
      setClassUsers(setUsersSortByTopic(usersData.filter(user => user.profile.name === studentUser.profile.name), 'General'));
    })
  }, [studentUser.profile, userClasses]);
  
  useEffect(() => {
    setLoadingApprentices(true);
    getSenpaiStudents(db, studentUser.id)
      .then(usersData => {
        setsenpaiStudents(usersData);
        setLoadingApprentices(false);
      })
  }, [studentUser])

  const setRankingPosition = (classUsers: StudentType[], currentIndex: number, position: number) => {
    if(currentIndex === 0){
      return position
    } else if(getUserTopicPoints(classUsers[currentIndex-1], currentTopicRanking) === getUserTopicPoints(classUsers[currentIndex], currentTopicRanking)) {
      return position 
    }else {
      return position + 1
    }
  };

  const handleDeleteUserAccount = () => {
    dispatch(deleteUserByUID(db, studentUser, studentUser.id, studentUser.belongedClassId,  () => {
      setDeleteAccountModal(false);
      navigate('/login');
    }))
  }

  return (
    <div className={styles['student-view']}>
      { studentUser.messages.length > 0 && activeMessages &&(
        <Modal onCancelBtnAction={handleCloseMessageModal}>
          <article className={styles['message-container']}>
            <MessageModal message={studentUser.messages[0]}/>
            <MainBtn text={'Continue'} action={handleCloseMessageModal}/>
          </article>
        </Modal>
      )}

      {deleteAccountModal && 
        <Modal onCancelBtnAction={() => {setDeleteAccountModal(false)}}>
          <article className={`${styles['message-container']} ${styles['delete-account-container']}`}>
            <h3>Warning</h3>
            <p>By deleting your account, you will lose all your points and progress</p>
            <MainBtn text={'Delete Account'} action={handleDeleteUserAccount}/>
          </article>
        </Modal>
      }

      <div className={styles['header-actions']}>
        <LogOut/>
        <button className={styles['delete-user']} onClick={()=> {
          setDeleteAccountModal(true);
        }}>
          Delete user
        </button>
      </div>
      <StudentInfo 
        name={studentUser.name} 
        profile={studentUser.profile.name}
        studentId={studentUser.universityId}
        image={userClasses?.profiles?.find(p => p.name.toLowerCase() === studentUser.profile.name.toLowerCase())?.img || ''}
      />
      {studentUser.profile.name !== 'senpai' && <Progress student={studentUser}/>}
      {studentUser.profile.name === 'senpai' && userClasses && <SenpaiActions students={senpaiStudents} userClass={userClasses} userId={studentUser.id}/>}
      {studentUser.profile.name === 'senpai' && userClasses && <h2 className={styles['senpai-points']}>Points: {studentUser.classState.points}</h2>}
      {studentUser.profile.name === 'senpai' && studentUser.studentsId && (
        <div className={styles['senpai-students']}>
          <h3 className={styles['senpai-students__title']}>Apprentices</h3>
          {loadingApprentices && <LoaderLine/>}
          {senpaiStudents.sort((a, b) => b.classState.points - a.classState.points).map((student, index) => (
            <Link
              to={`/student-topics-detail/${student.id}`}
              key={student.id}
              className={styles['apprentice-container']}
            >
              <div className={styles['apprentice-info']}>
                <div className={styles['apprentice-info__name']}>
                  <h3>{student.name}</h3>
                  <p>{student.classState.points}</p>
                </div>
                <Arrow right/>
              </div>
              <ProgressBar student={student}/>
            </Link>
          ))}
        </div>
      )}
      <div className={styles['ranking-container']}>
        <h3 className={styles['ranking-title']}>Ranking</h3>
        {studentUser.profile.name !== 'senpai' &&
          <SelectDropDown placeholder={currentTopicRanking} ref={selectDropdownRef}>
            <div>
              { userClasses &&
                ['General', ...userClasses?.topics.map(t => t.name)].map(topic => (
                  <p 
                    key={topic}
                    className={styles['profile']}
                    onClick={handleSetTopicRanking.bind(null, topic)}
                  >
                    {topic}
                  </p>
                ))
              }
            </div>
          </SelectDropDown>
        }
        <div className={styles['ranking-users']}>
          {loadingRankings && <LoaderLine/>}
          {classUsers &&
            classUsers.map((user, index) => {
              position = setRankingPosition(classUsers, index, position)
              return (
                <UserThumbNail 
                  key={user.id} 
                  rank={position} 
                  name={user.name} 
                  studentId={user.universityId} 
                  points={getUserTopicPoints(user, currentTopicRanking) || 0} 
                  isTeacher={false}
                  id={user.id}
                />
              )
            })
          }
        </div>
      </div>
    </div>
  )
}

export default StudentView