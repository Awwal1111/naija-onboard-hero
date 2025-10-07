import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, Clock, Trophy, CheckCircle, XCircle } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  correct_answer: number
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

const triviaQuestions: TriviaQuestion[] = [
  { id: '1', question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Port Harcourt'], correct_answer: 1, difficulty: 'easy', category: 'Geography' },
  { id: '2', question: 'Which year did Nigeria gain independence?', options: ['1958', '1960', '1962', '1963'], correct_answer: 1, difficulty: 'easy', category: 'History' },
  { id: '3', question: 'What is the largest ethnic group in Nigeria?', options: ['Yoruba', 'Igbo', 'Hausa-Fulani', 'Edo'], correct_answer: 2, difficulty: 'medium', category: 'Culture' },
  { id: '4', question: 'Which Nigerian author wrote "Things Fall Apart"?', options: ['Wole Soyinka', 'Chinua Achebe', 'Chimamanda Adichie', 'Ben Okri'], correct_answer: 1, difficulty: 'medium', category: 'Literature' },
  { id: '5', question: 'What is the currency of Nigeria?', options: ['Naira', 'Cedi', 'Franc', 'Rand'], correct_answer: 0, difficulty: 'easy', category: 'Economy' },
  { id: '6', question: 'Which river is the longest in Nigeria?', options: ['River Benue', 'River Niger', 'River Kaduna', 'River Cross'], correct_answer: 1, difficulty: 'medium', category: 'Geography' },
  { id: '7', question: 'Who was Nigeria\'s first President?', options: ['Nnamdi Azikiwe', 'Abubakar Tafawa Balewa', 'Obafemi Awolowo', 'Ahmadu Bello'], correct_answer: 0, difficulty: 'hard', category: 'History' },
  { id: '8', question: 'Which state is known as the "Centre of Excellence"?', options: ['Lagos', 'Ogun', 'Delta', 'Rivers'], correct_answer: 0, difficulty: 'medium', category: 'Geography' },
  { id: '9', question: 'Who won the Nobel Prize in Literature from Nigeria?', options: ['Chinua Achebe', 'Wole Soyinka', 'Chimamanda Adichie', 'Ben Okri'], correct_answer: 1, difficulty: 'medium', category: 'Literature' },
  { id: '10', question: 'What is Nigeria\'s most populous city?', options: ['Abuja', 'Kano', 'Lagos', 'Ibadan'], correct_answer: 2, difficulty: 'easy', category: 'Geography' },
  { id: '11', question: 'In which year did Nigeria become a republic?', options: ['1960', '1963', '1979', '1999'], correct_answer: 1, difficulty: 'hard', category: 'History' },
  { id: '12', question: 'What is the traditional attire of Yoruba men called?', options: ['Agbada', 'Kaftan', 'Jalabiya', 'Dashiki'], correct_answer: 0, difficulty: 'medium', category: 'Culture' },
  { id: '13', question: 'Which Nigerian musician is known as the "African Giant"?', options: ['Wizkid', 'Davido', 'Burna Boy', 'Tiwa Savage'], correct_answer: 2, difficulty: 'easy', category: 'Entertainment' },
  { id: '14', question: 'How many states are in Nigeria?', options: ['30', '33', '36', '40'], correct_answer: 2, difficulty: 'easy', category: 'Geography' },
  { id: '15', question: 'What is Nigeria\'s national motto?', options: ['Unity and Faith', 'Peace and Progress', 'Unity, Peace, Progress', 'Strength in Diversity'], correct_answer: 0, difficulty: 'medium', category: 'Culture' },
  { id: '16', question: 'Which Nigerian athlete won gold in the long jump at Olympics?', options: ['Mary Onyali', 'Chioma Ajunwa', 'Blessing Okagbare', 'Falilat Ogunkoya'], correct_answer: 1, difficulty: 'hard', category: 'Sports' },
  { id: '17', question: 'What is the largest city in Northern Nigeria?', options: ['Kaduna', 'Jos', 'Kano', 'Maiduguri'], correct_answer: 2, difficulty: 'medium', category: 'Geography' },
  { id: '18', question: 'Which Nigerian movie won an Oscar nomination?', options: ['The Figurine', 'October 1', 'Lionheart', 'King of Boys'], correct_answer: 2, difficulty: 'medium', category: 'Entertainment' },
  { id: '19', question: 'What is the official language of Nigeria?', options: ['Yoruba', 'Hausa', 'Igbo', 'English'], correct_answer: 3, difficulty: 'easy', category: 'Culture' },
  { id: '20', question: 'Who was Nigeria\'s first female pilot?', options: ['Blessing Liman', 'Chinyere Kalu', 'Funmilayo Ransome-Kuti', 'Margaret Ekpo'], correct_answer: 1, difficulty: 'hard', category: 'History' },
  { id: '21', question: 'Which Nigerian state produces the most oil?', options: ['Lagos', 'Rivers', 'Delta', 'Akwa Ibom'], correct_answer: 3, difficulty: 'medium', category: 'Economy' },
  { id: '22', question: 'What is the nickname of the Nigerian national football team?', options: ['Eagles', 'Super Eagles', 'Green Eagles', 'Flying Eagles'], correct_answer: 1, difficulty: 'easy', category: 'Sports' },
  { id: '23', question: 'Which year did Nigeria host the FIFA U-17 World Cup?', options: ['2007', '2009', '2015', '2019'], correct_answer: 1, difficulty: 'hard', category: 'Sports' },
  { id: '24', question: 'What is the largest university in Nigeria by land mass?', options: ['UI', 'ABU', 'OAU', 'UNICAL'], correct_answer: 1, difficulty: 'hard', category: 'Education' },
  { id: '25', question: 'Which Nigerian invented the "World Wide Web of Television"?', options: ['Philip Emeagwali', 'Jelani Aliyu', 'Ayodele Awojobi', 'Ndubuisi Ekekwe'], correct_answer: 0, difficulty: 'hard', category: 'Technology' },
  { id: '26', question: 'What is the traditional ruler in Yorubaland called?', options: ['Oba', 'Emir', 'Obi', 'Igwe'], correct_answer: 0, difficulty: 'medium', category: 'Culture' },
  { id: '27', question: 'Which state is the "Food Basket of the Nation"?', options: ['Benue', 'Kaduna', 'Kano', 'Plateau'], correct_answer: 0, difficulty: 'medium', category: 'Geography' },
  { id: '28', question: 'Who composed Nigeria\'s national anthem?', options: ['Herbert Macaulay', 'Ben Odiase', 'P.O. Aderibigbe', 'Lilian Jean Williams'], correct_answer: 2, difficulty: 'hard', category: 'History' },
  { id: '29', question: 'What is the largest market in West Africa located in Nigeria?', options: ['Balogun Market', 'Onitsha Market', 'Ariaria Market', 'Kurmi Market'], correct_answer: 1, difficulty: 'medium', category: 'Economy' },
  { id: '30', question: 'Which Nigerian won the African Cup of Nations Golden Boot in 2013?', options: ['Yakubu Aiyegbeni', 'Victor Moses', 'John Obi Mikel', 'Emmanuel Emenike'], correct_answer: 3, difficulty: 'hard', category: 'Sports' },
  { id: '31', question: 'What is the second largest city in Nigeria?', options: ['Kano', 'Ibadan', 'Port Harcourt', 'Benin City'], correct_answer: 0, difficulty: 'medium', category: 'Geography' },
  { id: '32', question: 'Which Nigerian actress is known as "Nollywood Queen"?', options: ['Genevieve Nnaji', 'Omotola Jalade', 'Funke Akindele', 'Rita Dominic'], correct_answer: 0, difficulty: 'easy', category: 'Entertainment' },
  { id: '33', question: 'What year was Lagos State created?', options: ['1967', '1976', '1987', '1991'], correct_answer: 1, difficulty: 'hard', category: 'History' },
  { id: '34', question: 'Which Nigerian invented the first African cryptocurrency?', options: ['Chinedu Echeruo', 'Sim Shagaya', 'Tunde Kehinde', 'Kunle Adeyemi'], correct_answer: 0, difficulty: 'hard', category: 'Technology' },
  { id: '35', question: 'What is the highest mountain in Nigeria?', options: ['Obudu Plateau', 'Chappal Waddi', 'Aso Rock', 'Zuma Rock'], correct_answer: 1, difficulty: 'hard', category: 'Geography' },
  { id: '36', question: 'Which Nigerian sang "Johnny"?', options: ['Yemi Alade', 'Tiwa Savage', 'Simi', 'Seyi Shay'], correct_answer: 0, difficulty: 'easy', category: 'Entertainment' },
  { id: '37', question: 'What is the literacy rate in Nigeria approximately?', options: ['50%', '62%', '75%', '80%'], correct_answer: 1, difficulty: 'medium', category: 'Education' },
  { id: '38', question: 'Which state in Nigeria has the most local governments?', options: ['Kano', 'Lagos', 'Rivers', 'Kaduna'], correct_answer: 0, difficulty: 'hard', category: 'Geography' },
  { id: '39', question: 'Who is known as the father of Nigerian nationalism?', options: ['Herbert Macaulay', 'Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello'], correct_answer: 0, difficulty: 'medium', category: 'History' },
  { id: '40', question: 'What is the popular Nigerian jollof rice spice?', options: ['Curry', 'Thyme', 'Paprika', 'Maggi'], correct_answer: 1, difficulty: 'easy', category: 'Culture' },
  { id: '41', question: 'Which Nigerian designed the BMW Z4?', options: ['Jelani Aliyu', 'Kunle Adeyemi', 'Ayodele Awojobi', 'Chike Obi'], correct_answer: 0, difficulty: 'medium', category: 'Technology' },
  { id: '42', question: 'What is Nigeria\'s dialing code?', options: ['+233', '+234', '+235', '+236'], correct_answer: 1, difficulty: 'easy', category: 'General' },
  { id: '43', question: 'Which Nigerian boxer was a world champion?', options: ['Samuel Peter', 'Bash Ali', 'Dick Tiger', 'Ike Ibeabuchi'], correct_answer: 2, difficulty: 'hard', category: 'Sports' },
  { id: '44', question: 'What is the largest ethnic group in the Middle Belt?', options: ['Tiv', 'Nupe', 'Idoma', 'Igala'], correct_answer: 0, difficulty: 'hard', category: 'Culture' },
  { id: '45', question: 'Which year did Nigeria win the FIFA U-17 World Cup first?', options: ['1985', '1987', '1993', '2007'], correct_answer: 0, difficulty: 'hard', category: 'Sports' },
  { id: '46', question: 'What is the oldest secondary school in Nigeria?', options: ['King\'s College', 'CMS Grammar School', 'Queen\'s College', 'Methodist Boys High School'], correct_answer: 1, difficulty: 'hard', category: 'Education' },
  { id: '47', question: 'Which Nigerian state has the longest coastline?', options: ['Delta', 'Lagos', 'Rivers', 'Akwa Ibom'], correct_answer: 0, difficulty: 'hard', category: 'Geography' },
  { id: '48', question: 'Who wrote the novel "Purple Hibiscus"?', options: ['Chimamanda Adichie', 'Buchi Emecheta', 'Sefi Atta', 'Helon Habila'], correct_answer: 0, difficulty: 'medium', category: 'Literature' },
  { id: '49', question: 'What is the traditional greeting in Igbo?', options: ['Bawo ni', 'Kedu', 'Sannu', 'Migwo'], correct_answer: 1, difficulty: 'easy', category: 'Culture' },
  { id: '50', question: 'Which Nigerian founded HopStop (acquired by Apple)?', options: ['Chinedu Echeruo', 'Sim Shagaya', 'Jason Njoku', 'Mark Essien'], correct_answer: 0, difficulty: 'hard', category: 'Technology' },
  { id: '51', question: 'What is the traditional dance of the Yoruba?', options: ['Sharo', 'Bata', 'Ekombi', 'Swange'], correct_answer: 1, difficulty: 'medium', category: 'Culture' },
  { id: '52', question: 'Which Nigerian state is called "The Sunshine State"?', options: ['Ondo', 'Ekiti', 'Osun', 'Ogun'], correct_answer: 0, difficulty: 'medium', category: 'Geography' },
  { id: '53', question: 'Who is Nigeria\'s youngest billionaire?', options: ['Njoku Jason', 'Obinwanne Okeke', 'Linda Ikeji', 'Tobi Amusan'], correct_answer: 0, difficulty: 'medium', category: 'Business' },
  { id: '54', question: 'What is the capital of Cross River State?', options: ['Calabar', 'Uyo', 'Port Harcourt', 'Yenagoa'], correct_answer: 0, difficulty: 'medium', category: 'Geography' },
  { id: '55', question: 'Which Nigerian rapper is known as "The King of the Street"?', options: ['Olamide', 'Reminisce', 'Phyno', 'Naira Marley'], correct_answer: 0, difficulty: 'easy', category: 'Entertainment' },
  { id: '56', question: 'What is the largest dam in Nigeria?', options: ['Shiroro Dam', 'Kainji Dam', 'Jebba Dam', 'Oyan Dam'], correct_answer: 1, difficulty: 'hard', category: 'Geography' },
  { id: '57', question: 'Which state has the Yankari Game Reserve?', options: ['Taraba', 'Bauchi', 'Borno', 'Adamawa'], correct_answer: 1, difficulty: 'hard', category: 'Geography' },
  { id: '58', question: 'Who is the richest man in Nigeria?', options: ['Mike Adenuga', 'Aliko Dangote', 'Femi Otedola', 'Tony Elumelu'], correct_answer: 1, difficulty: 'easy', category: 'Business' },
  { id: '59', question: 'What is the former name of Lagos?', options: ['Eko', 'Benin', 'Calabar', 'Bonny'], correct_answer: 0, difficulty: 'medium', category: 'History' },
  { id: '60', question: 'Which Nigerian won Olympic gold in football in 1996?', options: ['Jay-Jay Okocha', 'Nwankwo Kanu', 'Daniel Amokachi', 'Rashidi Yekini'], correct_answer: 1, difficulty: 'hard', category: 'Sports' },
  { id: '61', question: 'What is the traditional food made from cassava flour?', options: ['Eba', 'Amala', 'Tuwo', 'Semo'], correct_answer: 0, difficulty: 'easy', category: 'Culture' },
  { id: '62', question: 'Which state is known as "The Land of Aquatic Splendour"?', options: ['Rivers', 'Bayelsa', 'Delta', 'Akwa Ibom'], correct_answer: 1, difficulty: 'hard', category: 'Geography' },
  { id: '63', question: 'Who directed the movie "October 1"?', options: ['Kunle Afolayan', 'Tunde Kelani', 'Biyi Bandele', 'Jeta Amata'], correct_answer: 0, difficulty: 'medium', category: 'Entertainment' },
  { id: '64', question: 'What year was the Naira introduced?', options: ['1970', '1973', '1975', '1979'], correct_answer: 1, difficulty: 'hard', category: 'Economy' },
  { id: '65', question: 'Which Nigerian is known as "The Giant of Africa" in boxing?', options: ['Samuel Peter', 'Bash Ali', 'Dick Tiger', 'Ike Quartey'], correct_answer: 0, difficulty: 'medium', category: 'Sports' },
  { id: '66', question: 'What is the traditional Hausa greeting?', options: ['E kaasan', 'Sannu', 'Kedu', 'Pele'], correct_answer: 1, difficulty: 'easy', category: 'Culture' },
  { id: '67', question: 'Which university is the oldest in Nigeria?', options: ['UI', 'UNN', 'ABU', 'UNILAG'], correct_answer: 0, difficulty: 'medium', category: 'Education' },
  { id: '68', question: 'What is the national bird of Nigeria?', options: ['Black Crowned Crane', 'Grey Crowned Crane', 'Eagle', 'Peacock'], correct_answer: 0, difficulty: 'hard', category: 'General' },
  { id: '69', question: 'Which Nigerian state has the Osun-Osogbo Sacred Grove?', options: ['Osun', 'Oyo', 'Ogun', 'Ondo'], correct_answer: 0, difficulty: 'medium', category: 'Culture' },
  { id: '70', question: 'Who was the first Nigerian to play in the English Premier League?', options: ['Jay-Jay Okocha', 'Efan Ekoku', 'John Fashanu', 'Victor Ikpeba'], correct_answer: 1, difficulty: 'hard', category: 'Sports' },
  { id: '71', question: 'What is Nigeria\'s independence day?', options: ['October 1', 'October 7', 'September 30', 'November 1'], correct_answer: 0, difficulty: 'easy', category: 'History' },
  { id: '72', question: 'Which river forms Nigeria\'s border with Cameroon?', options: ['River Benue', 'River Cross', 'River Niger', 'River Kaduna'], correct_answer: 1, difficulty: 'hard', category: 'Geography' },
  { id: '73', question: 'What is the popular Nigerian street snack made from beans?', options: ['Akara', 'Puff-puff', 'Plantain chips', 'Chin chin'], correct_answer: 0, difficulty: 'easy', category: 'Culture' },
  { id: '74', question: 'Who founded Nollywood?', options: ['Hubert Ogunde', 'Kenneth Nnebue', 'Eddie Ugbomah', 'Ola Balogun'], correct_answer: 1, difficulty: 'hard', category: 'Entertainment' },
  { id: '75', question: 'What is the capital of Kano State?', options: ['Kano', 'Kaduna', 'Katsina', 'Jos'], correct_answer: 0, difficulty: 'easy', category: 'Geography' },
  { id: '76', question: 'Which Nigerian tech entrepreneur founded Andela?', options: ['Jeremy Johnson', 'Iyinoluwa Aboyeji', 'Sim Shagaya', 'Jason Njoku'], correct_answer: 1, difficulty: 'medium', category: 'Technology' },
  { id: '77', question: 'What is the traditional Yoruba drum called?', options: ['Talking Drum', 'Djembe', 'Bongo', 'Conga'], correct_answer: 0, difficulty: 'medium', category: 'Culture' },
  { id: '78', question: 'Which Nigerian won Africa\'s first Olympic gold medal?', options: ['Chioma Ajunwa', 'Mary Onyali', 'Blessing Okagbare', 'Falilat Ogunkoya'], correct_answer: 0, difficulty: 'hard', category: 'Sports' },
  { id: '79', question: 'What is the name of Nigeria\'s space agency?', options: ['NASRDA', 'NASDA', 'NASA-NG', 'NSAA'], correct_answer: 0, difficulty: 'hard', category: 'Technology' },
  { id: '80', question: 'Which state is called "The Treasure Base of the Nation"?', options: ['Abia', 'Anambra', 'Enugu', 'Imo'], correct_answer: 0, difficulty: 'medium', category: 'Geography' },
  { id: '81', question: 'What is the traditional Igbo wrapper called?', options: ['George', 'Akwete', 'Aso Oke', 'Ankara'], correct_answer: 1, difficulty: 'medium', category: 'Culture' },
  { id: '82', question: 'Who wrote "The Lion and the Jewel"?', options: ['Wole Soyinka', 'Chinua Achebe', 'J.P. Clark', 'Christopher Okigbo'], correct_answer: 0, difficulty: 'medium', category: 'Literature' },
  { id: '83', question: 'What is Nigeria\'s country code for internet domain?', options: ['.na', '.ng', '.nig', '.ngr'], correct_answer: 1, difficulty: 'easy', category: 'Technology' },
  { id: '84', question: 'Which Nigerian city is known as "The Garden City"?', options: ['Ibadan', 'Port Harcourt', 'Enugu', 'Calabar'], correct_answer: 1, difficulty: 'medium', category: 'Geography' },
  { id: '85', question: 'What is the popular Nigerian soup made with bitter leaf?', options: ['Bitter Leaf Soup', 'Egusi Soup', 'Ogbono Soup', 'Afang Soup'], correct_answer: 0, difficulty: 'easy', category: 'Culture' },
  { id: '86', question: 'Who composed Nigeria\'s national pledge?', options: ['Tai Solarin', 'Felicia Adebola', 'Ben Odiase', 'Herbert Macaulay'], correct_answer: 1, difficulty: 'hard', category: 'History' },
  { id: '87', question: 'Which Nigerian bank is the oldest?', options: ['First Bank', 'UBA', 'Union Bank', 'GTBank'], correct_answer: 0, difficulty: 'medium', category: 'Economy' },
  { id: '88', question: 'What is the highest rank in Nigerian Army?', options: ['General', 'Field Marshal', 'Chief of Army Staff', 'Lieutenant General'], correct_answer: 1, difficulty: 'hard', category: 'General' },
  { id: '89', question: 'Which state produces the most cocoa in Nigeria?', options: ['Cross River', 'Ondo', 'Ogun', 'Osun'], correct_answer: 1, difficulty: 'medium', category: 'Economy' },
  { id: '90', question: 'What is the traditional Efik dance?', options: ['Ekombi', 'Swange', 'Bata', 'Koroso'], correct_answer: 0, difficulty: 'hard', category: 'Culture' },
  { id: '91', question: 'Who is Nigeria\'s most decorated athlete?', options: ['Chioma Ajunwa', 'Mary Onyali', 'Blessing Okagbare', 'Tobi Amusan'], correct_answer: 1, difficulty: 'hard', category: 'Sports' },
  { id: '92', question: 'What year did Nigeria join OPEC?', options: ['1960', '1971', '1975', '1980'], correct_answer: 1, difficulty: 'hard', category: 'Economy' },
  { id: '93', question: 'Which Nigerian city hosted the 2009 FIFA U-17 World Cup final?', options: ['Abuja', 'Lagos', 'Calabar', 'Port Harcourt'], correct_answer: 0, difficulty: 'medium', category: 'Sports' },
  { id: '94', question: 'What is the traditional Tiv dance called?', options: ['Swange', 'Bata', 'Ekombi', 'Koroso'], correct_answer: 0, difficulty: 'hard', category: 'Culture' },
  { id: '95', question: 'Who is Nigeria\'s first female Vice-Chancellor?', options: ['Grace Alele-Williams', 'Bolanle Awe', 'Bisi Ogunleye', 'Dora Akunyili'], correct_answer: 0, difficulty: 'hard', category: 'Education' },
  { id: '96', question: 'What is the population of Nigeria approximately?', options: ['150 million', '180 million', '220 million', '250 million'], correct_answer: 2, difficulty: 'medium', category: 'General' },
  { id: '97', question: 'Which Nigerian designed the Civic Centre in Lagos?', options: ['Femi Majekodunmi', 'Demas Nwoko', 'John Godwin', 'Olumuyiwa Soriyan'], correct_answer: 2, difficulty: 'hard', category: 'Architecture' },
  { id: '98', question: 'What is Nigeria\'s largest export commodity?', options: ['Cocoa', 'Crude Oil', 'Palm Oil', 'Rubber'], correct_answer: 1, difficulty: 'easy', category: 'Economy' },
  { id: '99', question: 'Which state has the Gashaka Gumti National Park?', options: ['Taraba', 'Adamawa', 'Bauchi', 'Borno'], correct_answer: 0, difficulty: 'hard', category: 'Geography' },
  { id: '100', question: 'What is the traditional Ijaw canoe race called?', options: ['Regatta', 'Boat Racing', 'Canoe Sprint', 'Water Derby'], correct_answer: 0, difficulty: 'medium', category: 'Culture' },
  { id: '101', question: 'Who was the first Nigerian female professor?', options: ['Grace Alele-Williams', 'Adetoun Ogunsheye', 'Bolanle Awe', 'Margaret Ekpo'], correct_answer: 1, difficulty: 'hard', category: 'Education' },
  { id: '102', question: 'What is the name of the ancient Benin wall?', options: ['Benin Walls', 'Walls of Edo', 'Great Wall of Benin', 'Iya Walls'], correct_answer: 0, difficulty: 'medium', category: 'History' },
  { id: '103', question: 'Which Nigerian airline is the flag carrier?', options: ['Air Peace', 'Dana Air', 'Arik Air', 'Air Nigeria'], correct_answer: 0, difficulty: 'medium', category: 'General' },
  { id: '104', question: 'What is the traditional Nupe attire called?', options: ['Etibo', 'Agbada', 'Jalabiya', 'Babanriga'], correct_answer: 0, difficulty: 'hard', category: 'Culture' },
  { id: '105', question: 'Who founded the Sokoto Caliphate?', options: ['Usman dan Fodio', 'Muhammadu Bello', 'Ahmadu Bello', 'Abdullahi dan Fodio'], correct_answer: 0, difficulty: 'hard', category: 'History' },
  { id: '106', question: 'What is Nigeria\'s time zone?', options: ['GMT', 'GMT+1', 'GMT+2', 'WAT'], correct_answer: 1, difficulty: 'medium', category: 'General' },
  { id: '107', question: 'Which Nigerian won Big Brother Africa?', options: ['Uti Nwachukwu', 'Karen Igho', 'Dillish Mathews', 'Idris Sultan'], correct_answer: 0, difficulty: 'medium', category: 'Entertainment' },
  { id: '108', question: 'What is the oldest kingdom in Nigeria?', options: ['Benin Kingdom', 'Oyo Kingdom', 'Nri Kingdom', 'Kanem-Bornu'], correct_answer: 2, difficulty: 'hard', category: 'History' }
]

const NigerianTrivia: React.FC = () => {
  const { balance } = useWallet()
  const { user } = useAuth()
  const { toast } = useToast()
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(15)
  const [score, setScore] = useState(0)
  const [gameQuestions, setGameQuestions] = useState<TriviaQuestion[]>([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [playing, setPlaying] = useState(false)

  const ENTRY_FEE = 20
  const QUESTIONS_PER_GAME = 5

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (gameState === 'playing' && timeLeft > 0 && !showAnswer) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleTimeUp()
    }
    return () => clearTimeout(timer)
  }, [timeLeft, gameState, showAnswer])

  const startGame = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to play games",
        variant: "destructive",
      })
      return
    }

    if (balance.total < ENTRY_FEE) {
      toast({
        title: "Insufficient Balance",
        description: `You need NC ${ENTRY_FEE} to play Nigerian Trivia`,
        variant: "destructive",
      })
      return
    }

    setPlaying(true)

    try {
      // Deduct entry fee from wallet balance
      const { error: deductError } = await supabase.rpc('increment_wallet_balance', {
        target_user_id: user.id,
        amount_to_add: -ENTRY_FEE
      })

      if (deductError) throw deductError

      // Log the transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          kind: 'game_loss',
          amount: -ENTRY_FEE,
          status: 'completed',
          reference: 'Nigerian Trivia entry fee'
        } as any)

      // Shuffle questions and select random ones for unique game experience
      const shuffled = [...triviaQuestions].sort(() => Math.random() - 0.5)
      const selectedQuestions = shuffled.slice(0, QUESTIONS_PER_GAME)
      
      setGameQuestions(selectedQuestions)
      setGameState('playing')
      setCurrentQuestionIndex(0)
      setSelectedAnswers([])
      setTimeLeft(15)
      setScore(0)
      setShowAnswer(false)

      toast({
        title: "Game Started!",
        description: `Answer ${QUESTIONS_PER_GAME} questions to win prizes`,
      })
    } catch (error) {
      console.error('Error starting game:', error)
      toast({
        title: "Game Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setPlaying(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showAnswer) return

    const currentQuestion = gameQuestions[currentQuestionIndex]
    const isCorrect = answerIndex === currentQuestion.correct_answer
    
    setSelectedAnswers([...selectedAnswers, answerIndex])
    setShowAnswer(true)
    
    if (isCorrect) {
      setScore(score + 1)
    }

    // Move to next question after 2 seconds
    setTimeout(() => {
      if (currentQuestionIndex < gameQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setTimeLeft(15)
        setShowAnswer(false)
      } else {
        finishGame(isCorrect ? score + 1 : score)
      }
    }, 2000)
  }

  const handleTimeUp = () => {
    setSelectedAnswers([...selectedAnswers, -1])
    setShowAnswer(true)
    
    setTimeout(() => {
      if (currentQuestionIndex < gameQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setTimeLeft(15)
        setShowAnswer(false)
      } else {
        finishGame(score)
      }
    }, 2000)
  }

  const finishGame = async (finalScore: number) => {
    setGameState('finished')
    
    // Only give reward for perfect score (all 5 correct)
    let winnings = 0
    if (finalScore === 5) winnings = 50 // Perfect score only

    try {
      if (winnings > 0 && user) {
        // Add winnings to wallet balance
        const { error: winError } = await supabase.rpc('increment_wallet_balance', {
          target_user_id: user.id,
          amount_to_add: winnings
        })

        if (winError) throw winError

        // Log the transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            kind: 'game_win',
            amount: winnings,
            status: 'completed',
            reference: `Nigerian Trivia winnings (${finalScore}/${QUESTIONS_PER_GAME})`
          } as any)

        toast({
          title: "Congratulations!",
          description: `Perfect score! You won NC ${winnings}!`,
        })
      } else {
        toast({
          title: "Better luck next time!",
          description: `You got ${finalScore}/${QUESTIONS_PER_GAME} correct. Get all 5 correct to win NC 50!`,
        })
      }
    } catch (error) {
      console.error('Error processing winnings:', error)
    }
  }

  const resetGame = () => {
    setGameState('menu')
    setCurrentQuestionIndex(0)
    setSelectedAnswers([])
    setTimeLeft(30)
    setScore(0)
    setGameQuestions([])
    setShowAnswer(false)
  }

  if (gameState === 'menu') {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-900">
            <Brain className="h-6 w-6" />
            Nigerian Trivia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="space-y-2">
            <p className="text-green-800">Test your knowledge of Nigeria!</p>
            <p className="text-sm text-green-700">
              Answer {QUESTIONS_PER_GAME} questions in 15 seconds each
            </p>
          </div>
          
          <div className="p-4 bg-green-100 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Prizes:</h4>
            <div className="space-y-1 text-sm text-green-800">
              <div className="flex justify-between">
                <span>5/5 correct (Perfect!):</span>
                <Badge className="bg-green-200 text-green-800">NC 50</Badge>
              </div>
              <div className="flex justify-between">
                <span>Less than 5 correct:</span>
                <Badge className="bg-gray-200 text-gray-600">No Reward</Badge>
              </div>
              <p className="text-xs text-green-600 mt-2 font-medium">
                ⚡ Get ALL questions right to win!
              </p>
            </div>
          </div>

          {/* Ad Redemption Placeholder */}
          <div className="p-4 border-2 border-dashed border-green-300 rounded-lg bg-green-50">
            <p className="text-sm text-center text-green-700">
              Watch ads to redeem (Coming soon)
            </p>
          </div>

          <Button
            onClick={startGame}
            disabled={playing || balance.total < ENTRY_FEE}
            className="w-full"
            size="lg"
          >
            {playing ? (
              <>Starting Game...</>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Start Game (NC {ENTRY_FEE})
              </>
            )}
          </Button>

          {balance.total < ENTRY_FEE && (
            <p className="text-sm text-muted-foreground">
              Need more coins to play
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (gameState === 'playing') {
    const currentQuestion = gameQuestions[currentQuestionIndex]
    
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-900">
              Question {currentQuestionIndex + 1}/{QUESTIONS_PER_GAME}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <Badge variant={timeLeft <= 10 ? "destructive" : "secondary"}>
                {timeLeft}s
              </Badge>
            </div>
          </div>
          <Progress value={(timeLeft / 15) * 100} className="h-2" />
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-white rounded-lg border">
            <p className="font-medium text-gray-900">{currentQuestion.question}</p>
            <Badge className="mt-2 bg-green-100 text-green-800">
              {currentQuestion.category} • {currentQuestion.difficulty}
            </Badge>
          </div>

          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = "w-full text-left p-4 border-2 transition-colors"
              let icon = null

              if (showAnswer) {
                if (index === currentQuestion.correct_answer) {
                  buttonClass += " border-green-500 bg-green-100 text-green-900"
                  icon = <CheckCircle className="h-4 w-4 text-green-600" />
                } else if (selectedAnswers[currentQuestionIndex] === index) {
                  buttonClass += " border-red-500 bg-red-100 text-red-900"
                  icon = <XCircle className="h-4 w-4 text-red-600" />
                } else {
                  buttonClass += " border-gray-200 bg-gray-50 text-gray-600"
                }
              } else {
                buttonClass += " border-green-200 hover:border-green-400 hover:bg-green-50"
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={buttonClass}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showAnswer}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option}</span>
                    {icon}
                  </div>
                </Button>
              )
            })}
          </div>

          <div className="text-center text-sm text-green-700">
            Score: {score}/{currentQuestionIndex + (showAnswer ? 1 : 0)}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (gameState === 'finished') {
    const winnings = score === 5 ? 50 : 0
    
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-900">
            <Trophy className="h-6 w-6" />
            Game Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="p-6 bg-white rounded-lg border">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {score}/{QUESTIONS_PER_GAME}
            </div>
            <p className="text-green-800 mb-4">Correct Answers</p>
            
            {winnings > 0 ? (
              <div className="space-y-2">
                <Badge className="bg-green-200 text-green-800 text-lg px-4 py-2">
                  You won NC {winnings}!
                </Badge>
                <p className="text-sm text-green-700">
                  Winnings added to your withdrawable balance
                </p>
              </div>
            ) : (
              <p className="text-green-700">
                Need all 5 correct answers to win NC 50. Try again!
              </p>
            )}
          </div>

          <Button onClick={resetGame} className="w-full" size="lg">
            Play Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}

export default NigerianTrivia