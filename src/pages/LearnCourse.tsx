import { CoursePlayer } from '@/components/learn/CoursePlayer';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { learningCourses } from '@/lib/learningCourses';

export default function LearnCourse() {
  const { courseId } = useParams();
  const course = learningCourses.find(c => c.id === courseId);

  return (
    <>
      <Helmet>
        <title>{course?.title || 'Course'} | NaijaLancers Learn Hub</title>
        <meta 
          name="description" 
          content={course?.description || 'Learn digital skills for free on NaijaLancers'} 
        />
      </Helmet>
      <CoursePlayer />
    </>
  );
}
