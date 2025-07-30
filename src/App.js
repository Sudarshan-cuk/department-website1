import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, onSnapshot, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Lock, User, Book, Briefcase, Phone, Home, Users, LogIn, LogOut, UserPlus, Atom, Feather, Quote, Landmark, Store, Video, FileText, BrainCircuit, BookCopy, ShieldCheck, Check, X, GraduationCap, Search, Megaphone, Info, Edit, Trash2, UserCircle, Download, Camera, MessageSquare, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Firebase Configuration ---
const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : '{"apiKey":"AIzaSyA1wMCNN0UFzWcK_lajR8k12kYG5RIFzm0","authDomain":"dept-of-education-site.firebaseapp.com","projectId":"dept-of-education-site","storageBucket":"dept-of-education-site.firebasestorage.app","messagingSenderId":"753917525071","appId":"1:753917525071:web:003e17c1e716a8333ffe3a","measurementId":"G-YF2ELY4KH6"}';
const firebaseConfig = JSON.parse(firebaseConfigString);

// --- App Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-dept-app';

// --- Animation Variants ---
const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
};

const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
};


// --- Helper Functions ---
const ErrorBox = ({ message }) => {
    if (!message) return null;
    return (
        <motion.div 
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative my-4" 
            role="alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <span className="block sm:inline">{message}</span>
        </motion.div>
    );
};

const SuccessBox = ({ message }) => {
    if (!message) return null;
        return (
        <motion.div 
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative my-4" 
            role="alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <span className="block sm:inline">{message}</span>
        </motion.div>
    );
};


// --- Main App Component ---
export default function App() {
    const [page, setPage] = useState('home');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && !currentUser.isAnonymous) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser({ uid: currentUser.uid, ...userDoc.data(), isAnonymous: false });
                } else {
                     setUser({ uid: currentUser.uid, email: currentUser.email, isAnonymous: false });
                }
            } else {
                setUser(currentUser ? { isAnonymous: true } : null);
            }
            setLoading(false);
        });

        const initialAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        };

        initialAuth();
        return () => unsubscribe();
    }, []);

    const renderPage = () => {
        switch (page) {
            case 'home':
                return <HomePage setPage={setPage} />;
            case 'about':
                return <AboutPage />;
            case 'courses':
                return <CoursesPage />;
            case 'faculty':
                return <FacultyPage />;
            case 'alumni':
                return <AlumniPage />;
            case 'gallery':
                return <GalleryPage />;
            case 'download':
                return <DownloadAppPage />;
            case 'noticeboard':
                return <NoticeBoardPage />;
            case 'notes':
                return <NotesPage user={user} />;
            case 'contact':
                return <ContactPage />;
            case 'login':
                return <LoginPage setPage={setPage} />;
            case 'register':
                return <RegisterPage setPage={setPage} />;
            case 'admin':
                return <AdminPage user={user} />;
            case 'profile':
                return <ProfilePage user={user} />;
            default:
                return <NotFoundPage setPage={setPage} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <motion.div
                    className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32"
                    animate={{ rotate: 360 }}
                    transition={{ loop: Infinity, ease: "linear", duration: 1 }}
                ></motion.div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 font-sans text-gray-800">
            <Header setPage={setPage} user={user} />
            <main className="p-4 md:p-8 min-h-[calc(100vh-128px)]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={page}
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                    >
                        {renderPage()}
                    </motion.div>
                </AnimatePresence>
            </main>
            <Footer />
        </div>
    );
}

// --- Header Component ---
const Header = ({ setPage, user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setPage('home');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const NavLink = ({ pageName, children }) => (
        <motion.button 
            onClick={() => { setPage(pageName); setIsMenuOpen(false); }} 
            className="text-gray-700 hover:text-orange-600 transition duration-300 ease-in-out py-2 px-3 rounded-md font-medium"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
        >
            {children}
        </motion.button>
    );

    return (
        <motion.header 
            className="bg-white shadow-md sticky top-0 z-50"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 50 }}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex-shrink-0">
                        <button onClick={() => setPage('home')} className="flex items-center space-x-2">
                             <svg className="h-10 w-10 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                <path d="M12 12.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 7.5 12 7.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM12 4.5c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span className="text-xl font-bold text-gray-800">Dept. of Education</span>
                        </button>
                    </div>
                    <nav className="hidden md:flex items-center space-x-1">
                        <NavLink pageName="home"><Home className="inline-block mr-1 h-5 w-5"/>Home</NavLink>
                        <NavLink pageName="about"><Users className="inline-block mr-1 h-5 w-5"/>About</NavLink>
                        <NavLink pageName="courses"><Book className="inline-block mr-1 h-5 w-5"/>Courses</NavLink>
                        <NavLink pageName="faculty"><Briefcase className="inline-block mr-1 h-5 w-5"/>Faculty</NavLink>
                        <NavLink pageName="alumni"><GraduationCap className="inline-block mr-1 h-5 w-5"/>Alumni</NavLink>
                        <NavLink pageName="gallery"><Camera className="inline-block mr-1 h-5 w-5"/>Gallery</NavLink>
                        <NavLink pageName="noticeboard"><Megaphone className="inline-block mr-1 h-5 w-5"/>Notice Board</NavLink>
                        <NavLink pageName="notes"><BookCopy className="inline-block mr-1 h-5 w-5"/>Resources</NavLink>
                        <NavLink pageName="download"><Download className="inline-block mr-1 h-5 w-5"/>App</NavLink>
                        <NavLink pageName="contact"><Phone className="inline-block mr-1 h-5 w-5"/>Contact</NavLink>
                        {user?.role === 'admin' && <NavLink pageName="admin"><ShieldCheck className="inline-block mr-1 h-5 w-5"/>Admin</NavLink>}
                    </nav>
                    <div className="hidden md:flex items-center space-x-2">
                        {user && !user.isAnonymous ? (
                            <>
                                <button onClick={() => setPage('profile')} className="text-gray-600 font-medium hover:text-orange-600 flex items-center">
                                    <UserCircle className="mr-2 h-5 w-5"/> Profile
                                </button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleLogout} className="flex items-center bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition duration-300">
                                    <LogOut className="mr-2 h-5 w-5" /> Logout
                                </motion.button>
                            </>
                        ) : (
                            <>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPage('login')} className="flex items-center bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition duration-300">
                                    <LogIn className="mr-2 h-5 w-5" /> Login
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPage('register')} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition duration-300">
                                    <UserPlus className="mr-2 h-5 w-5" /> Register
                                </motion.button>
                            </>
                        )}
                    </div>
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500">
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <AnimatePresence>
            {isMenuOpen && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden"
                >
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <NavLink pageName="home">Home</NavLink>
                        <NavLink pageName="about">About</NavLink>
                        <NavLink pageName="courses">Courses</NavLink>
                        <NavLink pageName="faculty">Faculty</NavLink>
                        <NavLink pageName="alumni">Alumni</NavLink>
                        <NavLink pageName="gallery">Gallery</NavLink>
                        <NavLink pageName="noticeboard">Notice Board</NavLink>
                        <NavLink pageName="notes">Resources</NavLink>
                        <NavLink pageName="download">App</NavLink>
                        <NavLink pageName="contact">Contact</NavLink>
                        {user?.role === 'admin' && <NavLink pageName="admin">Admin</NavLink>}
                         <div className="border-t border-gray-200 my-2"></div>
                        {user && !user.isAnonymous ? (
                            <>
                                <div className="px-3 py-2 text-gray-600 font-medium">Welcome, {user.firstName || user.email}</div>
                                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full text-left flex items-center bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition duration-300">
                                    <LogOut className="mr-2 h-5 w-5" /> Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { setPage('login'); setIsMenuOpen(false); }} className="w-full text-left flex items-center bg-orange-500 text-white px-3 py-2 rounded-md hover:bg-orange-600 transition duration-300">
                                    <LogIn className="mr-2 h-5 w-5" /> Login
                                </button>
                                <button onClick={() => { setPage('register'); setIsMenuOpen(false); }} className="w-full text-left mt-2 flex items-center bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 transition duration-300">
                                    <UserPlus className="mr-2 h-5 w-5" /> Register
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </motion.header>
    );
};

// --- Page Components ---
const PageContainer = ({ title, children }) => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1 
            className="text-4xl font-extrabold text-gray-900 mb-6 border-b-4 border-orange-600 pb-2"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
        >
            {title}
        </motion.h1>
        <motion.div 
            className="bg-white p-6 sm:p-8 rounded-xl shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
        >
            {children}
        </motion.div>
    </div>
);

const DisclaimerBanner = () => (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 text-center" role="alert">
        <div className="flex items-center justify-center">
            <Info className="h-6 w-6 mr-3" />
            <div>
                <p className="font-bold">This is a student-run website.</p>
                <p className="text-sm">This site was created by students with faculty permission and is not the official website of the Central University of Kerala.</p>
            </div>
        </div>
    </div>
);

const HomePage = ({ setPage }) => (
    <>
        <DisclaimerBanner />
        <div className="bg-white">
            <div className="relative isolate px-6 pt-14 lg:px-8">
                <div className="mx-auto max-w-2xl py-24 sm:py-32 lg:py-20">
                    <div className="text-center">
                        <motion.h1 
                            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            Department of Education
                        </motion.h1>
                         <motion.p 
                            className="mt-4 text-2xl font-semibold text-orange-600"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                         >
                            Integrated Teacher Education Programme (ITEP)
                        </motion.p>
                        <motion.p 
                            className="mt-6 text-lg leading-8 text-gray-600"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            Welcome, Sudarshan! This is the hub for aspiring educators. Explore our ITEP program, meet our faculty, and discover resources to shape your future in teaching.
                        </motion.p>
                        <motion.div 
                            className="mt-10 flex items-center justify-center gap-x-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                        >
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPage('courses')} className="rounded-md bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
                                Explore Courses
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPage('about')} className="text-sm font-semibold leading-6 text-gray-900">
                                Learn more <span aria-hidden="true">→</span>
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    </>
);

const AboutPage = () => {
    const [content, setContent] = useState({ vision: '', mission: '', main: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, `artifacts/${appId}/public/data/pageContent`, "about");
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setContent(doc.data());
            } else {
                // Set default content if nothing in DB
                setContent({
                    main: "The Department of Education at the Central University of Kerala is dedicated to nurturing the next generation of educators through innovative teaching practices and research.",
                    vision: "To be a leading centre for teacher education, recognized for excellence in preparing reflective practitioners and educational leaders who can contribute to social transformation.",
                    mission: "To provide a holistic and interdisciplinary learning environment, foster critical thinking and creativity, and instill a lifelong passion for learning and teaching among our students."
                });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <p>Loading content...</p>;

    return (
        <PageContainer title="About Our Department">
            <p className="text-lg text-gray-700 mb-4">{content.main}</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div whileHover={{ y: -5 }} className="bg-gray-100 p-6 rounded-lg">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Our Vision</h3>
                    <p className="text-gray-600">{content.vision}</p>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="bg-gray-100 p-6 rounded-lg">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Our Mission</h3>
                    <p className="text-gray-600">{content.mission}</p>
                </motion.div>
            </div>
        </PageContainer>
    );
};

const CoursesPage = () => {
    const specializations = [
        { 
            title: "B.Sc. B.Ed. Physics", 
            description: "Integrates the rigorous study of physical sciences with advanced pedagogical training, preparing future physics educators for the modern classroom.",
            icon: Atom,
            theme: { bg: "bg-blue-100", text: "text-blue-500", border: "border-blue-500" }
        },
        { 
            title: "B.Sc. B.Ed. Zoology", 
            description: "A dual-degree program combining life sciences with teacher training for aspiring biology educators, focusing on practical and theoretical knowledge.",
            icon: Feather,
            theme: { bg: "bg-green-100", text: "text-green-500", border: "border-green-500" }
        },
        { 
            title: "B.A. B.Ed. English", 
            description: "Develops a deep understanding of English literature and language, coupled with the art of teaching it effectively to diverse learners.",
            icon: Quote,
            theme: { bg: "bg-purple-100", text: "text-purple-500", border: "border-purple-500" }
        },
        { 
            title: "B.A. B.Ed. Economics", 
            description: "Combines economic theory and analysis with educational principles to prepare teachers who can demystify the world of economics for students.",
            icon: Landmark,
            theme: { bg: "bg-red-100", text: "text-red-500", border: "border-red-500" }
        },
        { 
            title: "B.Com. B.Ed.", 
            description: "An integrated program that equips students with commerce knowledge and teaching skills, creating competent educators for business and accounting subjects.",
            icon: Store,
            theme: { bg: "bg-yellow-100", text: "text-yellow-500", border: "border-yellow-500" }
        },
    ];

    return (
        <PageContainer title="Integrated Teacher Education Programme (ITEP)">
             <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-800">A 4-Year Dual-Degree Journey</h2>
                <p className="text-lg text-gray-600 mt-2 max-w-3xl mx-auto">
                    Our flagship ITEP is a comprehensive program preparing teachers for the new school structure. Choose your specialization and embark on a rewarding career in education.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {specializations.map((spec, index) => {
                    const Icon = spec.icon;
                    return (
                        <motion.div 
                            key={index} 
                            className={`bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center border-t-4 ${spec.theme.border}`}
                            whileHover={{ scale: 1.05, y: -10 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <div className={`p-4 rounded-full ${spec.theme.bg}`}>
                                <Icon className={`h-12 w-12 ${spec.theme.text}`} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mt-6 mb-2">{spec.title}</h3>
                            <p className="text-gray-600">{spec.description}</p>
                        </motion.div>
                    )
                })}
            </div>
        </PageContainer>
    );
};

const FacultyPage = () => {
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const facultyCollectionRef = collection(db, `artifacts/${appId}/public/data/faculty`);
        const q = query(facultyCollectionRef, orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFaculty(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <p>Loading faculty...</p>;

    return (
        <PageContainer title="Our Esteemed Faculty">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {faculty.map((member, index) => {
                    const initials = member.name.split(' ').map(n => n[0]).join('').substring(0,2);
                    return (
                        <motion.div 
                            key={member.id} 
                            className="text-center bg-white rounded-lg shadow-md p-6"
                            whileHover={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <img className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-gray-200 bg-gray-100 flex items-center justify-center" src={member.photoURL || `https://placehold.co/150x150/E2E8F0/4A5568?text=${initials}`} alt={member.name} />
                            <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                            <p className="text-md text-orange-600 font-semibold">{member.title}</p>
                        </motion.div>
                    )
                })}
            </div>
        </PageContainer>
    );
};

const AlumniPage = () => {
    const [alumni, setAlumni] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const alumniCollectionRef = collection(db, `artifacts/${appId}/public/data/alumni`);
        const q = query(alumniCollectionRef, orderBy("year", "desc"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAlumni(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredAlumni = alumni.filter(person => 
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.year.toString().includes(searchTerm)
    );

    if (loading) return <p>Loading alumni...</p>;

    return (
        <PageContainer title="Alumni Network">
            <div className="mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search by name or year..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 pl-12 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <AnimatePresence>
                {filteredAlumni.map((person) => {
                    const initials = person.name.split(' ').map(n => n[0]).join('').substring(0,2);
                    return (
                    <motion.div 
                        key={person.id} 
                        className="text-center group"
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    >
                        <img 
                            className="w-32 h-32 rounded-full mx-auto mb-2 border-4 border-gray-200 group-hover:border-orange-500 transition-all duration-300" 
                            src={person.photoURL || `https://placehold.co/200x200/E2E8F0/4A5568?text=${initials}`} 
                            alt={person.name} 
                        />
                        <h3 className="text-lg font-semibold text-gray-800">{person.name}</h3>
                        <p className="text-sm text-gray-500">Batch of {person.year}</p>
                    </motion.div>
                )})}
                </AnimatePresence>
            </div>
            {filteredAlumni.length === 0 && (
                <p className="text-center text-gray-500 mt-10">No alumni found matching your search.</p>
            )}
        </PageContainer>
    );
};

const GalleryPage = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImg, setSelectedImg] = useState(null);

    useEffect(() => {
        const galleryCollectionRef = collection(db, `artifacts/${appId}/public/data/gallery`);
        const q = query(galleryCollectionRef, orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <p>Loading gallery...</p>;

    return (
        <PageContainer title="Event Gallery">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img, index) => (
                    <motion.div 
                        key={img.id} 
                        className="aspect-w-1 aspect-h-1 cursor-pointer"
                        layoutId={img.id}
                        onClick={() => setSelectedImg(img)}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <img src={img.url} alt={img.caption || 'Gallery image'} className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow" />
                    </motion.div>
                ))}
            </div>
            <AnimatePresence>
                {selectedImg && (
                    <motion.div 
                        layoutId={selectedImg.id}
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedImg(null)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <img src={selectedImg.url} alt={selectedImg.caption} className="max-w-full max-h-full rounded-lg" />
                    </motion.div>
                )}
            </AnimatePresence>
        </PageContainer>
    );
};

const DownloadAppPage = () => {
    // IMPORTANT: Replace this with the actual public link to your APK file.
    const apkDownloadLink = "#"; // e.g., a Google Drive link, etc.

    return (
        <PageContainer title="Download Our Android App">
            <div className="text-center">
                <p className="text-lg text-gray-600 mb-8">
                    Get the full experience on the go! Download our official Android app to stay updated with notices, resources, and department news.
                </p>
                <motion.a 
                    href={apkDownloadLink}
                    download
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center justify-center bg-green-500 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-green-600 transition-colors"
                >
                    <Download className="mr-3 h-6 w-6" />
                    Download APK
                </motion.a>
                {apkDownloadLink === "#" && <p className="text-red-500 mt-4 text-sm">Note: The download link has not been configured by the administrator yet.</p>}
            </div>
        </PageContainer>
    );
};


const NoticeBoardPage = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const noticesCollectionRef = collection(db, `artifacts/${appId}/public/data/notices`);
        const q = query(noticesCollectionRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const noticesList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                return { id: doc.id, ...data, createdAt };
            });
            setNotices(noticesList);
            setLoading(false);
        }, (err) => {
            setError("Failed to fetch notices.");
            console.error(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const isNew = (date) => {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return date > threeDaysAgo;
    };

    return (
        <PageContainer title="Notice Board">
            {loading && <p>Loading notices...</p>}
            <ErrorBox message={error} />
            {!loading && notices.length === 0 && <p className="text-center text-gray-500">No notices to display.</p>}
            <div className="space-y-6">
                {notices.map((notice, index) => (
                    <motion.div 
                        key={notice.id} 
                        className="p-5 rounded-lg shadow-md border-l-4 border-orange-500 bg-orange-50"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-gray-800">{notice.title}</h3>
                            {isNew(notice.createdAt) && <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">NEW</span>}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 mb-3">
                            Posted on: {notice.createdAt.toLocaleDateString()}
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
                    </motion.div>
                ))}
            </div>
        </PageContainer>
    );
};

const NotesPage = ({ user }) => {
    const [resources, setResources] = useState([]);
    const [newResource, setNewResource] = useState({ title: '', content: '', category: 'classNotes' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loadingResources, setLoadingResources] = useState(true);
    const [activeTab, setActiveTab] = useState('classNotes');

    const categories = [
        { id: 'classNotes', label: 'Class Notes', icon: BookCopy },
        { id: 'teacherNotes', label: 'Teacher\'s Notes', icon: FileText },
        { id: 'seminarVideos', label: 'Seminar Videos', icon: Video },
        { id: 'pyq', label: 'Previous Questions', icon: Book },
        { id: 'mindMaps', label: 'Mind Maps', icon: BrainCircuit },
    ];

    useEffect(() => {
        const resourcesCollectionRef = collection(db, `artifacts/${appId}/public/data/resources`);
        const q = query(resourcesCollectionRef, where("status", "==", "approved"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const resourcesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setResources(resourcesList);
            setLoadingResources(false);
        }, (err) => {
            setError("Failed to fetch resources. Please try again later.");
            console.error(err);
            setLoadingResources(false);
        });
        
        return () => unsubscribe();
    }, []);

    const handleAddResource = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!newResource.title || !newResource.content) {
            setError("Title and content/link cannot be empty.");
            return;
        }
        if (!user || user.isAnonymous) {
            setError("You must be logged in to add resources.");
            return;
        }
        
        try {
            const resourcesCollectionRef = collection(db, `artifacts/${appId}/public/data/resources`);
            await addDoc(resourcesCollectionRef, {
                ...newResource,
                author: user.firstName || user.email,
                userId: user.uid,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });
            setNewResource({ title: '', content: '', category: newResource.category });
            setSuccess("Resource submitted for review. It will appear publicly after approval.");
        } catch (err) {
            setError("Failed to add resource. Please try again.");
            console.error(err);
        }
    };
    
    const filteredResources = resources.filter(resource => resource.category === activeTab);

    return (
        <PageContainer title="Learning Resources">
            {(!user || user.isAnonymous) && (
                 <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md" role="alert">
                    <p className="font-bold">Login Required</p>
                    <p>Please log in to share resources with the community.</p>
                </div>
            )}

            {user && !user.isAnonymous && (
                <div className="mb-12 bg-gray-50 p-6 rounded-lg shadow-inner">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Share a New Resource</h2>
                    <form onSubmit={handleAddResource} className="space-y-4">
                        <ErrorBox message={error} />
                        <SuccessBox message={success} />
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                id="category"
                                value={newResource.category}
                                onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                            >
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                id="title"
                                type="text"
                                placeholder="Resource Title"
                                value={newResource.title}
                                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                            />
                        </div>
                        <div>
                           <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                                {newResource.category === 'seminarVideos' ? 'Video Link (e.g., YouTube)' : 'Content or Link'}
                           </label>
                            <textarea
                                id="content"
                                placeholder={newResource.category === 'seminarVideos' ? 'https://youtube.com/watch?v=...' : 'Type notes here or paste a link...'}
                                value={newResource.content}
                                onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                            ></textarea>
                        </div>
                        <button type="submit" className="bg-orange-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-700 transition duration-300 flex items-center justify-center">
                            Submit for Review
                        </button>
                    </form>
                </div>
            )}
            
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                    {categories.map(cat => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`${
                                    activeTab === cat.id
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                            >
                                <Icon className="mr-2 h-5 w-5" />
                                {cat.label}
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div>
                {loadingResources ? (
                    <p>Loading resources...</p>
                ) : filteredResources.length > 0 ? (
                    <div className="space-y-4">
                        {filteredResources.map(resource => (
                            <div key={resource.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                                <h3 className="text-xl font-semibold text-gray-900">{resource.title}</h3>
                                <p className="text-gray-700 my-2 whitespace-pre-wrap">{resource.content}</p>
                                <p className="text-sm text-gray-500 mt-3">
                                    Shared by: <span className="font-medium">{resource.author || 'Anonymous'}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-10">
                        No resources found in this category yet.
                    </p>
                )}
            </div>
        </PageContainer>
    );
};

const AdminPage = ({ user }) => {
    if (user?.role !== 'admin') {
        return <PageContainer title="Access Denied"><p>You do not have permission to view this page.</p></PageContainer>;
    }

    return (
        <PageContainer title="Admin Dashboard">
            <div className="space-y-12">
                <AdminManageContent />
                <AdminManageFaculty />
                <AdminManageAlumni />
                <AdminManageGallery />
                <AdminManageNotices />
                <AdminManageResources />
            </div>
        </PageContainer>
    );
};

// --- Admin Sub-Components ---
const AdminManageContent = () => {
    const [content, setContent] = useState({ vision: '', mission: '', main: '' });
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');

    const contentRef = doc(db, `artifacts/${appId}/public/data/pageContent`, "about");

    useEffect(() => {
        getDoc(contentRef).then(doc => {
            if(doc.exists()) setContent(doc.data());
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSuccess('');
        await setDoc(contentRef, content, { merge: true });
        setSuccess('Content updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
    };

    if (loading) return <p>Loading content editor...</p>;

    return (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Manage 'About Us' Page</h2>
            <SuccessBox message={success} />
            <div className="space-y-4">
                <textarea value={content.main} onChange={e => setContent({...content, main: e.target.value})} className="w-full p-2 border rounded" rows="4" placeholder="Main description..."/>
                <textarea value={content.vision} onChange={e => setContent({...content, vision: e.target.value})} className="w-full p-2 border rounded" rows="3" placeholder="Vision..."/>
                <textarea value={content.mission} onChange={e => setContent({...content, mission: e.target.value})} className="w-full p-2 border rounded" rows="3" placeholder="Mission..."/>
                <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">Save Content</button>
            </div>
        </div>
    );
};

const AdminManageFaculty = () => { /* ... UI to add/delete faculty ... */ return <div className="bg-gray-50 p-6 rounded-lg shadow-inner"><h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Faculty (Coming Soon)</h2></div>; };
const AdminManageAlumni = () => { /* ... UI to add/delete alumni ... */ return <div className="bg-gray-50 p-6 rounded-lg shadow-inner"><h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Alumni (Coming Soon)</h2></div>; };
const AdminManageGallery = () => { /* ... UI to add/delete gallery images ... */ return <div className="bg-gray-50 p-6 rounded-lg shadow-inner"><h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Gallery (Coming Soon)</h2></div>; };
const AdminManageNotices = () => { /* ... UI to add/delete notices ... */ return <div className="bg-gray-50 p-6 rounded-lg shadow-inner"><h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Notices (Coming Soon)</h2></div>; };
const AdminManageResources = () => { /* ... UI to approve/reject resources ... */ return <div className="bg-gray-50 p-6 rounded-lg shadow-inner"><h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Resources (Coming Soon)</h2></div>; };


const ContactPage = () => {
    const [suggestion, setSuggestion] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleSuggestionSubmit = async (e) => {
        e.preventDefault();
        setSuccess('');
        setError('');
        if (!suggestion) {
            setError('Suggestion cannot be empty.');
            return;
        }
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/suggestions`), {
                suggestion,
                submittedAt: new Date()
            });
            setSuccess('Thank you! Your suggestion has been submitted.');
            setSuggestion('');
        } catch (err) {
            setError('Failed to submit suggestion. Please try again.');
            console.error(err);
        }
    };

    return (
    <PageContainer title="Get In Touch">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Contact Information</h3>
                <p className="text-lg text-gray-700 mb-2">
                    <strong>Address:</strong> Central University of Kerala, Tejaswini Hills, Periye, Kasaragod, Kerala, 671320
                </p>
                <p className="text-lg text-gray-700 mb-2">
                    <strong>Phone:</strong> (0467) 230 9000
                </p>
                <p className="text-lg text-gray-700 mb-2">
                    <strong>Email:</strong> education@cukerala.ac.in
                </p>
                 <div className="mt-8">
                    <h3 className="text-2xl font-bold mb-4 text-gray-800">Office Hours</h3>
                    <p className="text-lg text-gray-700">Monday - Friday: 9:30 AM - 5:30 PM</p>
                    <p className="text-lg text-gray-700">Saturday - Sunday: Closed</p>
                </div>
            </div>
            <div className="space-y-8">
                <div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-800">Send us a Message</h3>
                    <form className="space-y-4">
                        <input type="text" placeholder="Your Name" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"/>
                        <input type="email" placeholder="Your Email" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"/>
                        <textarea placeholder="Your Message" rows="5" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"></textarea>
                        <button type="submit" className="w-full bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700 transition duration-300">
                            Send Message
                        </button>
                    </form>
                </div>
                <div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-800">Suggestion Box</h3>
                    <form onSubmit={handleSuggestionSubmit} className="space-y-4">
                        <SuccessBox message={success} />
                        <ErrorBox message={error} />
                        <textarea 
                            placeholder="Have a suggestion to improve our site or department? Let us know!" 
                            rows="4" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                        ></textarea>
                        <button type="submit" className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center">
                           <MessageSquare className="mr-2 h-5 w-5"/> Submit Suggestion
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </PageContainer>
    );
};

// --- Auth & Other Pages ---
const AuthFormContainer = ({ title, children }) => (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div 
            className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {title}
                </h2>
            </div>
            {children}
        </motion.div>
    </div>
);

const LoginPage = ({ setPage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setPage('home');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthFormContainer title="Sign in to your account">
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                <ErrorBox message={error} />
                <div className="rounded-md shadow-sm -space-y-px">
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="appearance-none rounded-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                            placeholder="Email address"
                        />
                    </div>
                    <div className="relative">
                         <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="appearance-none rounded-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                            placeholder="Password"
                        />
                    </div>
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </div>
            </form>
             <p className="mt-2 text-center text-sm text-gray-600">
                Or{' '}
                <button onClick={() => setPage('register')} className="font-medium text-orange-600 hover:text-orange-500">
                    create a new account
                </button>
            </p>
        </AuthFormContainer>
    );
};

const RegisterPage = ({ setPage }) => {
    const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;
            await setDoc(doc(db, `artifacts/${appId}/users`, user.uid), {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                role: 'student'
            });
            setSuccess("Registration successful! You can now log in.");
            setTimeout(() => setPage('login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthFormContainer title="Create a new account">
            <form className="mt-8 space-y-4" onSubmit={handleRegister}>
                <ErrorBox message={error} />
                <SuccessBox message={success} />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="First Name" required className="w-full p-3 border border-gray-300 rounded-lg"/>
                    <input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Last Name" required className="w-full p-3 border border-gray-300 rounded-lg"/>
                </div>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email address" required className="w-full p-3 border border-gray-300 rounded-lg"/>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Password" required className="w-full p-3 border border-gray-300 rounded-lg"/>
                <div>
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300">
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </div>
            </form>
             <p className="mt-2 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button onClick={() => setPage('login')} className="font-medium text-orange-600 hover:text-orange-500">
                    Sign in
                </button>
            </p>
        </AuthFormContainer>
    );
};


const ProfilePage = ({ user }) => {
    if (!user) return <PageContainer title="Profile"><p>You must be logged in to view this page.</p></PageContainer>;

    return (
        <PageContainer title="My Profile">
            <div className="p-4">
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
            </div>
        </PageContainer>
    );
};

const NotFoundPage = ({ setPage }) => (
    <PageContainer title="Page Not Found">
        <div className="text-center">
            <h2 className="text-6xl font-bold text-orange-500">404</h2>
            <p className="text-xl mt-4">Oops! The page you're looking for doesn't exist.</p>
            <button onClick={() => setPage('home')} className="mt-8 bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700">
                Go back to Home
            </button>
        </div>
    </PageContainer>
);


// --- Footer Component ---
const Footer = () => (
    <footer className="bg-white border-t border-gray-200">
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center text-gray-500">
            <p className="text-sm font-semibold text-gray-600">Disclaimer: This is a student-run website and not the official site of the Central University of Kerala.</p>
            <p className="mt-2">&copy; {new Date().getFullYear()} Department of Education, Central University of Kerala. All Rights Reserved.</p>
            <p className="text-sm mt-2">Designed with ❤️ for students and faculty.</p>
        </div>
    </footer>
);
