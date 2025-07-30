import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    signInAnonymously,
    signInWithCustomToken,
    sendPasswordResetEmail
} from 'firebase/auth';
import { initializeFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, onSnapshot, updateDoc, query, where, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Firebase Configuration ---
// FIX: Reverted to dynamic configuration to resolve 'auth/custom-token-mismatch'.
// The hardcoded config was causing a mismatch with the environment's authentication token.
// This logic ensures the app uses the correct Firebase project config provided by the execution environment.
const firebaseConfigString = typeof __firebase_config !== 'undefined' 
    ? __firebase_config 
    : JSON.stringify({
        apiKey: "AIzaSyA1wMCNN0UFzWcK_lajR8k12kYG5RIFzm0",
        authDomain: "dept-of-education-site.firebaseapp.com",
        projectId: "dept-of-education-site",
        storageBucket: "dept-of-education-site.firebasestorage.app",
        messagingSenderId: "753917525071",
        appId: "1:753917525071:web:003e17c1e716a8333ffe3a",
        measurementId: "G-YF2ELY4KH6"
      });
const firebaseConfig = JSON.parse(firebaseConfigString);


// --- App Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Initialize Firestore with experimental settings to potentially mitigate network errors.
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false, // Fallback for environments that don't support fetch streams well
});
const storage = getStorage(app);
// The __app_id variable is provided by the environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-dept-app';

// --- Icon Mapping ---
// Allows us to specify icon names as strings in Firestore for dynamic rendering.
const { Lock, User, Book, Briefcase, Phone, Home, Users, LogIn, LogOut, UserPlus, Atom, Feather, Quote, Landmark, Store, Video, FileText, BrainCircuit, BookCopy, ShieldCheck, Check, X, GraduationCap, Search, Megaphone, Info, Edit, Trash2, UserCircle, Download, Camera, MessageSquare, Upload, PlusCircle, AlertCircle } = LucideIcons;

const DynamicIcon = ({ name, ...props }) => {
    const IconComponent = LucideIcons[name];
    if (!IconComponent) {
        // Fallback icon if the specified one doesn't exist in lucide-react.
        return <AlertCircle {...props} />;
    }
    return <IconComponent {...props} />;
};

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


// --- Helper Components ---
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

const LoginPrompt = ({ setPage }) => (
    <div className="text-center py-16">
        <Lock className="mx-auto h-16 w-16 text-gray-400" />
        <h2 className="mt-4 text-2xl font-bold text-gray-800">Content Restricted</h2>
        <p className="mt-2 text-gray-600">You must be logged in to view this page.</p>
        <div className="mt-6 flex items-center justify-center gap-x-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPage('login')} className="flex items-center bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition duration-300">
                <LogIn className="mr-2 h-5 w-5" /> Login
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPage('register')} className="flex items-center bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition duration-300">
                <UserPlus className="mr-2 h-5 w-5" /> Register
            </motion.button>
        </div>
    </div>
);


// --- Main App Component ---
export default function App() {
    const [page, setPage] = useState('home');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // Effect for handling Firebase authentication state changes.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && !currentUser.isAnonymous) {
                // If a user is logged in, fetch their profile from Firestore.
                const userDocRef = doc(db, `artifacts/${appId}/users`, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser({ uid: currentUser.uid, ...userDoc.data(), isAnonymous: false });
                } else {
                     // If no profile exists, create a basic user object.
                     setUser({ uid: currentUser.uid, email: currentUser.email, isAnonymous: false });
                }
            } else {
                // Handle anonymous or logged-out users.
                setUser(currentUser ? { isAnonymous: true } : null);
            }
            setLoading(false);
        });

        // Function to handle initial authentication, using a custom token if provided.
        const initialAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Initial authentication failed:", error);
            }
        };

        initialAuth();
        // Cleanup subscription on component unmount.
        return () => unsubscribe();
    }, []);

    // Router to render the correct page component based on the 'page' state.
    const renderPage = () => {
        switch (page) {
            case 'home':
                return <HomePage setPage={setPage} />;
            case 'about':
                return <AboutPage />;
            case 'courses':
                return <CoursesPage setPage={setPage} setSelectedCourse={setSelectedCourse} />;
            case 'faculty':
                return <FacultyPage user={user} setPage={setPage} />;
            case 'alumni':
                return <AlumniPage user={user} setPage={setPage} />;
            case 'batchmates':
                return <BatchmatesPage user={user} setPage={setPage} course={selectedCourse} />;
            case 'gallery':
                return <GalleryPage user={user} setPage={setPage} />;
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
            case 'forgot-password':
                return <ForgotPasswordPage setPage={setPage} />;
            case 'admin':
                return <AdminPage user={user} />;
            case 'profile':
                return <ProfilePage user={user} />;
            default:
                return <NotFoundPage setPage={setPage} />;
        }
    };

    // Display a loading spinner while authentication is in progress.
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

    // Main application layout.
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
const PageContainer = ({ title, children, backButton }) => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
            {backButton && (
                 <motion.button 
                    onClick={backButton} 
                    className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <LucideIcons.ArrowLeft className="h-6 w-6 text-gray-700"/>
                </motion.button>
            )}
            <motion.h1 
                className="text-4xl font-extrabold text-gray-900 border-b-4 border-orange-600 pb-2"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                {title}
            </motion.h1>
        </div>
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
                            Welcome! This is the hub for aspiring educators at the Central University of Kerala, Periye. Explore our ITEP program, meet our faculty, and discover resources to shape your future in teaching.
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

const CoursesPage = ({ setPage, setSelectedCourse }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const coursesCollectionRef = collection(db, `artifacts/${appId}/public/data/courses`);
        const q = query(coursesCollectionRef, orderBy("title"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching courses: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleViewBatchmates = (course) => {
        setSelectedCourse(course);
        setPage('batchmates');
    };
    
    if (loading) return <p>Loading courses...</p>;

    return (
        <PageContainer title="Integrated Teacher Education Programme (ITEP)">
             <div className="text-center mb-12">
                 <h2 className="text-3xl font-bold text-gray-800">A 4-Year Dual-Degree Journey</h2>
                 <p className="text-lg text-gray-600 mt-2 max-w-3xl mx-auto">
                     Our flagship ITEP is a comprehensive program preparing teachers for the new school structure, as envisioned in NEP 2020. Choose your specialization and embark on a rewarding career in education.
                 </p>
             </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map((spec, index) => {
                    const theme = spec.theme || { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-500" };
                    return (
                        <motion.div 
                            key={spec.id} 
                            className={`bg-white rounded-xl shadow-lg p-8 flex flex-col justify-between border-t-4 ${theme.border}`}
                            whileHover={{ scale: 1.05, y: -10 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <div>
                                <div className="flex justify-center mb-4">
                                     <div className={`p-4 rounded-full ${theme.bg}`}>
                                        <DynamicIcon name={spec.iconName || 'Book'} className={`h-12 w-12 ${theme.text}`} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-gray-800 mt-6 mb-2">{spec.title}</h3>
                                    <p className="text-gray-600 flex-grow">{spec.description}</p>
                                </div>
                            </div>
                            <div className="mt-6 text-center">
                                <motion.button 
                                     whileHover={{ scale: 1.05 }} 
                                     whileTap={{ scale: 0.95 }}
                                     onClick={() => handleViewBatchmates(spec)} 
                                     className="bg-orange-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors w-full"
                                >
                                     View Batchmates
                                 </motion.button>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
             {courses.length === 0 && !loading && (
                <div className="text-center col-span-full py-10">
                    <p className="text-gray-500">No courses have been added yet. Please check back later.</p>
                </div>
            )}
        </PageContainer>
    );
};

const FacultyPage = ({ user, setPage }) => {
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && !user.isAnonymous) {
            const facultyCollectionRef = collection(db, `artifacts/${appId}/public/data/faculty`);
            const q = query(facultyCollectionRef, orderBy("name"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setFaculty(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user || user.isAnonymous) {
        return <PageContainer title="Our Esteemed Faculty"><LoginPrompt setPage={setPage} /></PageContainer>;
    }
    
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
                            <img className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-gray-200 bg-gray-100 flex items-center justify-center object-cover" src={member.photoURL || `https://placehold.co/150x150/E2E8F0/4A5568?text=${initials}`} alt={member.name} />
                            <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                            <p className="text-md text-orange-600 font-semibold">{member.title}</p>
                        </motion.div>
                    )
                })}
            </div>
             {faculty.length === 0 && <p className="text-center text-gray-500 mt-8">No faculty members have been added yet.</p>}
        </PageContainer>
    );
};

const AlumniPage = ({ user, setPage }) => {
    const [alumni, setAlumni] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user && !user.isAnonymous) {
            const alumniCollectionRef = collection(db, `artifacts/${appId}/public/data/alumni`);
            // FIX: Removed compound orderBy to prevent index error. Sorting is now done client-side.
            const q = query(alumniCollectionRef, orderBy("year", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const alumniList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort by year (desc), then name (asc)
                alumniList.sort((a, b) => {
                    if (a.year > b.year) return -1;
                    if (a.year < b.year) return 1;
                    return a.name.localeCompare(b.name);
                });
                setAlumni(alumniList);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user || user.isAnonymous) {
        return <PageContainer title="Alumni Network"><LoginPrompt setPage={setPage} /></PageContainer>;
    }

    const filteredAlumni = alumni.filter(person => 
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.year.toString().includes(searchTerm) ||
        (person.courseName && person.courseName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <p>Loading alumni...</p>;

    return (
        <PageContainer title="Alumni Network">
            <div className="mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search by name, year, or course..."
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
                            className="w-32 h-32 rounded-full mx-auto mb-2 border-4 border-gray-200 group-hover:border-orange-500 transition-all duration-300 object-cover" 
                            src={person.photoURL || `https://placehold.co/200x200/E2E8F0/4A5568?text=${initials}`} 
                            alt={person.name} 
                        />
                        <h3 className="text-lg font-semibold text-gray-800">{person.name}</h3>
                        <p className="text-sm text-gray-500">Batch of {person.year}</p>
                        <p className="text-xs text-orange-600">{person.courseName}</p>
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

const BatchmatesPage = ({ user, setPage, course }) => {
    const [batchmates, setBatchmates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && !user.isAnonymous && course) {
            const alumniCollectionRef = collection(db, `artifacts/${appId}/public/data/alumni`);
            // FIX: Removed compound orderBy to prevent index error. Sorting is now done client-side.
            const q = query(alumniCollectionRef, where("courseId", "==", course.id));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const batchmatesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort
                batchmatesList.sort((a, b) => {
                    if (a.year > b.year) return -1;
                    if (a.year < b.year) return 1;
                    return a.name.localeCompare(b.name);
                });
                setBatchmates(batchmatesList);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching batchmates: ", error);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, [user, course]);

    if (!user || user.isAnonymous) {
        return <PageContainer title="Batchmates"><LoginPrompt setPage={setPage} /></PageContainer>;
    }

    if (!course) {
        return (
            <PageContainer title="Error" backButton={() => setPage('courses')}>
                <p>No course selected. Please go back to the courses page and try again.</p>
            </PageContainer>
        );
    }
    
    if (loading) return <p>Loading batchmates...</p>;

    return (
        <PageContainer title={`Batchmates: ${course.title}`} backButton={() => setPage('courses')}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {batchmates.map((person) => {
                    const initials = person.name.split(' ').map(n => n[0]).join('').substring(0,2);
                    return (
                        <motion.div 
                            key={person.id} 
                            className="text-center"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring' }}
                        >
                            <img 
                                className="w-32 h-32 rounded-full mx-auto mb-2 border-4 border-gray-200 object-cover" 
                                src={person.photoURL || `https://placehold.co/200x200/E2E8F0/4A5568?text=${initials}`} 
                                alt={person.name} 
                            />
                            <h3 className="text-lg font-semibold text-gray-800">{person.name}</h3>
                            <p className="text-sm text-gray-500">Batch of {person.year}</p>
                        </motion.div>
                    )
                })}
            </div>
            {batchmates.length === 0 && (
                <p className="text-center text-gray-500 mt-10">No alumni found for this course yet.</p>
            )}
        </PageContainer>
    );
};


const GalleryPage = ({ user, setPage }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImg, setSelectedImg] = useState(null);

    useEffect(() => {
        if (user && !user.isAnonymous) {
            const galleryCollectionRef = collection(db, `artifacts/${appId}/public/data/gallery`);
            const q = query(galleryCollectionRef, orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user || user.isAnonymous) {
        return <PageContainer title="Event Gallery"><LoginPrompt setPage={setPage} /></PageContainer>;
    }

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
            {images.length === 0 && <p className="text-center text-gray-500 mt-8">The gallery is empty. Check back soon for photos!</p>}
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
                        <motion.img 
                            src={selectedImg.url} 
                            alt={selectedImg.caption} 
                            className="max-w-full max-h-full rounded-lg" 
                            initial={{scale: 0.8}} 
                            animate={{scale: 1}}
                        />
                         {selectedImg.caption && <motion.p className="text-white absolute bottom-5 bg-black bg-opacity-50 px-4 py-2 rounded-lg">{selectedImg.caption}</motion.p>}
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
                    className={`inline-flex items-center justify-center bg-green-500 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-green-600 transition-colors ${apkDownloadLink === '#' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={(e) => apkDownloadLink === '#' && e.preventDefault()}
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
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
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

    const categories = useMemo(() => [
        { id: 'classNotes', label: 'Class Notes', icon: BookCopy },
        { id: 'teacherNotes', label: 'Teacher\'s Notes', icon: FileText },
        { id: 'seminarVideos', label: 'Seminar Videos', icon: Video },
        { id: 'pyq', label: 'Previous Questions', icon: Book },
        { id: 'mindMaps', label: 'Mind Maps', icon: BrainCircuit },
        { id: 'prospectus', label: 'Prospectus', icon: FileText},
        { id: 'curriculum', label: 'Curriculum', icon: BookCopy},
        { id: 'guidelines', label: 'NEP Guidelines', icon: Landmark},
    ], []);

    useEffect(() => {
        const resourcesCollectionRef = collection(db, `artifacts/${appId}/public/data/resources`);
        // FIX: Removed compound query to prevent index error. Filtering is now done client-side.
        const q = query(resourcesCollectionRef, orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const resourcesList = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(resource => resource.status === 'approved'); // Client-side filter
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
                createdAt: serverTimestamp(),
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
                                placeholder={newResource.category === 'seminarVideos' ? 'https://www.youtube.com/watch?v=...' : 'Type notes here or paste a link...'}
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
                <AdminManageCourses />
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
const AdminSection = ({ title, children }) => (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">{title}</h2>
        {children}
    </div>
);

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
    }, [contentRef]);

    const handleSave = async () => {
        setSuccess('');
        await setDoc(contentRef, content, { merge: true });
        setSuccess('Content updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
    };

    if (loading) return <p>Loading content editor...</p>;

    return (
        <AdminSection title="Manage 'About Us' Page">
            <SuccessBox message={success} />
            <div className="space-y-4">
                <textarea value={content.main} onChange={e => setContent({...content, main: e.target.value})} className="w-full p-2 border rounded" rows="4" placeholder="Main description..."/>
                <textarea value={content.vision} onChange={e => setContent({...content, vision: e.target.value})} className="w-full p-2 border rounded" rows="3" placeholder="Vision..."/>
                <textarea value={content.mission} onChange={e => setContent({...content, mission: e.target.value})} className="w-full p-2 border rounded" rows="3" placeholder="Mission..."/>
                <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">Save Content</button>
            </div>
        </AdminSection>
    );
};

// Generic CRUD Hook for Admin Panels to reduce boilerplate.
const useAdminCRUD = (collectionName) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const collectionRef = useMemo(() => collection(db, `artifacts/${appId}/public/data/${collectionName}`), [collectionName]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, [collectionRef]);

    const addItem = (data) => addDoc(collectionRef, { ...data, createdAt: serverTimestamp() });
    const updateItem = (id, data) => updateDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id), data);
    const deleteItem = (id) => deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));

    return { items, loading, addItem, updateItem, deleteItem };
};

const AdminManageCourses = () => {
    const { items: courses, loading, addItem, updateItem, deleteItem } = useAdminCRUD('courses');
    const [formData, setFormData] = useState({ title: '', description: '', iconName: 'Book', theme: { border: 'border-gray-500', bg: 'bg-gray-100', text: 'text-gray-500' } });
    const [editingId, setEditingId] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingId) {
            await updateItem(editingId, formData);
        } else {
            await addItem(formData);
        }
        setFormData({ title: '', description: '', iconName: 'Book', theme: { border: 'border-gray-500', bg: 'bg-gray-100', text: 'text-gray-500' } });
        setEditingId(null);
    };

    const handleEdit = (course) => {
        setFormData(course);
        setEditingId(course.id);
    };

    return (
        <AdminSection title="Manage Courses">
            <form onSubmit={handleSubmit} className="mb-6 space-y-3">
                <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Course Title" className="w-full p-2 border rounded" required />
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description" className="w-full p-2 border rounded" required />
                <input value={formData.iconName} onChange={e => setFormData({...formData, iconName: e.target.value})} placeholder="Lucide Icon Name (e.g., Atom)" className="w-full p-2 border rounded" />
                <div className="grid grid-cols-3 gap-2">
                    <input value={formData.theme.border} onChange={e => setFormData({...formData, theme: {...formData.theme, border: e.target.value}})} placeholder="Border Color (e.g., border-blue-500)" className="w-full p-2 border rounded" />
                    <input value={formData.theme.bg} onChange={e => setFormData({...formData, theme: {...formData.theme, bg: e.target.value}})} placeholder="Icon BG Color (e.g., bg-blue-100)" className="w-full p-2 border rounded" />
                    <input value={formData.theme.text} onChange={e => setFormData({...formData, theme: {...formData.theme, text: e.target.value}})} placeholder="Icon Text Color (e.g., text-blue-500)" className="w-full p-2 border rounded" />
                </div>
                <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded">{editingId ? 'Update Course' : 'Add Course'}</button>
                {editingId && <button onClick={() => { setEditingId(null); setFormData({ title: '', description: '', iconName: 'Book', theme: { border: 'border-gray-500', bg: 'bg-gray-100', text: 'text-gray-500' } }); }} className="bg-gray-500 text-white py-2 px-4 rounded ml-2">Cancel Edit</button>}
            </form>
            {loading ? <p>Loading...</p> : (
                <ul className="space-y-2">
                    {courses.map(course => (
                        <li key={course.id} className="flex justify-between items-center p-2 bg-white rounded">
                            <span>{course.title}</span>
                            <div>
                                <button onClick={() => handleEdit(course)} className="text-blue-500 mr-2"><Edit size={18} /></button>
                                <button onClick={() => deleteItem(course.id)} className="text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </AdminSection>
    );
};

const AdminManageAlumni = () => {
    const { items: alumni, addItem, updateItem, deleteItem } = useAdminCRUD('alumni');
    const { items: courses } = useAdminCRUD('courses');
    const [formData, setFormData] = useState({ name: '', year: '', courseId: '', courseName: '' });
    const [editingId, setEditingId] = useState(null);

    const handleCourseChange = (e) => {
        const courseId = e.target.value;
        const course = courses.find(c => c.id === courseId);
        setFormData({ ...formData, courseId, courseName: course ? course.title : '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingId) {
            await updateItem(editingId, formData);
        } else {
            await addItem(formData);
        }
        setFormData({ name: '', year: '', courseId: '', courseName: '' });
        setEditingId(null);
    };

    const handleEdit = (person) => {
        setFormData(person);
        setEditingId(person.id);
    };

    return (
        <AdminSection title="Manage Alumni">
             <form onSubmit={handleSubmit} className="mb-6 space-y-3">
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Alumnus Name" className="w-full p-2 border rounded" required />
                <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="Graduation Year" className="w-full p-2 border rounded" required />
                <select value={formData.courseId} onChange={handleCourseChange} className="w-full p-2 border rounded" required>
                    <option value="">Select Course</option>
                    {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
                <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded">{editingId ? 'Update Alumnus' : 'Add Alumnus'}</button>
                {editingId && <button onClick={() => { setEditingId(null); setFormData({ name: '', year: '', courseId: '', courseName: '' }); }} className="bg-gray-500 text-white py-2 px-4 rounded ml-2">Cancel Edit</button>}
            </form>
            <ul className="space-y-2">
                {alumni.map(person => (
                    <li key={person.id} className="flex justify-between items-center p-2 bg-white rounded">
                        <span>{person.name} ({person.year}) - {person.courseName}</span>
                        <div>
                            <button onClick={() => handleEdit(person)} className="text-blue-500 mr-2"><Edit size={18} /></button>
                            <button onClick={() => deleteItem(person.id)} className="text-red-500"><Trash2 size={18} /></button>
                        </div>
                    </li>
                ))}
            </ul>
        </AdminSection>
    );
};

const AdminManageFaculty = () => {
    const { items: faculty, addItem, updateItem, deleteItem } = useAdminCRUD('faculty');
    const [formData, setFormData] = useState({ name: '', title: '' });
    const [editingId, setEditingId] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingId) { await updateItem(editingId, formData); } else { await addItem(formData); }
        setFormData({ name: '', title: '' });
        setEditingId(null);
    };

    const handleEdit = (member) => { setFormData(member); setEditingId(member.id); };

    return (
        <AdminSection title="Manage Faculty">
            <form onSubmit={handleSubmit} className="mb-6 space-y-3">
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Faculty Name" className="w-full p-2 border rounded" required />
                <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Title/Designation" className="w-full p-2 border rounded" required />
                <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded">{editingId ? 'Update' : 'Add'}</button>
                {editingId && <button onClick={() => { setEditingId(null); setFormData({ name: '', title: ''}); }} className="bg-gray-500 text-white py-2 px-4 rounded ml-2">Cancel</button>}
            </form>
            <ul className="space-y-2">
                {faculty.map(item => (
                    <li key={item.id} className="flex justify-between items-center p-2 bg-white rounded">
                        <span>{item.name} - {item.title}</span>
                        <div>
                            <button onClick={() => handleEdit(item)} className="text-blue-500 mr-2"><Edit size={18} /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-500"><Trash2 size={18} /></button>
                        </div>
                    </li>
                ))}
            </ul>
        </AdminSection>
    );
};

const AdminManageGallery = () => {
    const { items: images, addItem, deleteItem } = useAdminCRUD('gallery');
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { setError('Please select a file to upload.'); return; }
        setUploading(true);
        setError('');
        const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            await addItem({ url, caption, fileName: file.name });
            setFile(null);
            setCaption('');
            e.target.reset(); // Reset file input
        } catch (err) {
            setError('Upload failed. Please try again.');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };
    
    const handleDeleteImage = async (image) => {
        try {
            // First, delete the Firestore document.
            await deleteItem(image.id);
            // Then, delete the file from Cloud Storage.
            const imageRef = ref(storage, `gallery/${image.fileName}`);
            await deleteObject(imageRef);
        } catch(err) {
            console.error("Error deleting image: ", err);
            // If the file doesn't exist in storage but the doc does, just delete the doc.
            if (err.code === 'storage/object-not-found') {
                 await deleteItem(image.id);
            }
        }
    }

    return (
        <AdminSection title="Manage Gallery">
            <form onSubmit={handleSubmit} className="mb-6 space-y-3">
                <ErrorBox message={error} />
                <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full p-2 border rounded" accept="image/*" required/>
                <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Optional Caption" className="w-full p-2 border rounded" />
                <button type="submit" disabled={uploading} className="bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-400">{uploading ? 'Uploading...' : 'Upload Image'}</button>
            </form>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map(img => (
                    <div key={img.id} className="relative">
                        <img src={img.url} className="w-full h-32 object-cover rounded"/>
                        <button onClick={() => handleDeleteImage(img)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </AdminSection>
    );
};

const AdminManageNotices = () => {
    const { items: notices, addItem, updateItem, deleteItem } = useAdminCRUD('notices');
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [editingId, setEditingId] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingId) { await updateItem(editingId, formData); } else { await addItem(formData); }
        setFormData({ title: '', content: '' });
        setEditingId(null);
    };
    
    const handleEdit = (notice) => { setFormData(notice); setEditingId(notice.id); };

    return (
        <AdminSection title="Manage Notices">
            <form onSubmit={handleSubmit} className="mb-6 space-y-3">
                <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Notice Title" className="w-full p-2 border rounded" required />
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Notice Content" className="w-full p-2 border rounded" rows="4" required />
                <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded">{editingId ? 'Update Notice' : 'Post Notice'}</button>
                 {editingId && <button onClick={() => { setEditingId(null); setFormData({ title: '', content: ''}); }} className="bg-gray-500 text-white py-2 px-4 rounded ml-2">Cancel</button>}
            </form>
             <ul className="space-y-2">
                {notices.map(item => (
                    <li key={item.id} className="flex justify-between items-center p-2 bg-white rounded">
                        <span>{item.title}</span>
                        <div>
                            <button onClick={() => handleEdit(item)} className="text-blue-500 mr-2"><Edit size={18} /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-500"><Trash2 size={18} /></button>
                        </div>
                    </li>
                ))}
            </ul>
        </AdminSection>
    );
};

const AdminManageResources = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const resourcesRef = collection(db, `artifacts/${appId}/public/data/resources`);
        const q = query(resourcesRef, orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleStatusChange = async (id, status) => {
        const resourceRef = doc(db, `artifacts/${appId}/public/data/resources`, id);
        await updateDoc(resourceRef, { status });
    };

    const deleteResource = (id) => {
        deleteDoc(doc(db, `artifacts/${appId}/public/data/resources`, id));
    };

    const pending = resources.filter(r => r.status === 'pending');
    const approved = resources.filter(r => r.status === 'approved');

    return (
        <AdminSection title="Manage Resources">
            <h3 className="text-xl font-semibold mt-4 mb-2">Pending Approval ({pending.length})</h3>
            {loading ? <p>Loading...</p> : pending.length === 0 ? <p>No pending resources.</p> : (
                <ul className="space-y-2">
                    {pending.map(res => (
                        <li key={res.id} className="p-3 bg-yellow-50 rounded border border-yellow-200">
                            <p className="font-bold">{res.title}</p>
                            <p className="text-sm text-gray-600 my-1">{res.content}</p>
                            <p className="text-xs text-gray-500">By: {res.author}</p>
                            <div className="mt-2">
                                <button onClick={() => handleStatusChange(res.id, 'approved')} className="bg-green-500 text-white text-xs py-1 px-2 rounded mr-2">Approve</button>
                                <button onClick={() => deleteResource(res.id)} className="bg-red-500 text-white text-xs py-1 px-2 rounded">Reject & Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <h3 className="text-xl font-semibold mt-8 mb-2">Approved Resources ({approved.length})</h3>
             {loading ? <p>Loading...</p> : approved.length === 0 ? <p>No approved resources.</p> : (
                <ul className="space-y-2">
                    {approved.map(res => (
                        <li key={res.id} className="p-2 bg-white rounded flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{res.title}</p>
                                <p className="text-sm text-gray-500">{res.category}</p>
                            </div>
                            <button onClick={() => deleteResource(res.id)} className="text-red-500"><Trash2 size={18} /></button>
                        </li>
                    ))}
                </ul>
            )}
        </AdminSection>
    );
};


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

                <div className="flex items-center justify-end">
                    <div className="text-sm">
                        <button onClick={() => setPage('forgot-password')} className="font-medium text-orange-600 hover:text-orange-500">
                            Forgot your password?
                        </button>
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
                role: 'student' // Default role
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

const ForgotPasswordPage = ({ setPage }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess('Password reset email sent! Please check your inbox.');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthFormContainer title="Reset your password">
            <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
                <ErrorBox message={error} />
                <SuccessBox message={success} />
                <p className="text-center text-sm text-gray-600">
                    Enter your email address and we will send you a link to reset your password.
                </p>
                <div className="rounded-md shadow-sm">
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                            placeholder="Email address"
                        />
                    </div>
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </div>
            </form>
            <p className="mt-2 text-center text-sm text-gray-600">
                Remember your password?{' '}
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
            <div className="p-4 space-y-2">
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> <span className="capitalize font-semibold">{user.role}</span></p>
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
            <p className="mt-2">© {new Date().getFullYear()} Department of Education, Central University of Kerala, Periye. All Rights Reserved.</p>
            <p className="text-sm mt-2">Designed with ❤️ for students and faculty.</p>
        </div>
    </footer>
);
