import { useState } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

import { Hero } from "./Hero";
import { About } from "./About";
import { Services } from "./Services";
import { Features } from "./Features";
import { Testimonials } from "./Testimonials";
import { CTA } from "./CTA";
import { Footer } from "./Footer";
import { AuthPage } from "./AuthPage";
import { AdminDashboard } from "./AdminDashboard";
import { ECGMonitor } from "./ECGMonitor";
import { Toaster } from "sonner";


import { AnimatePresence, motion } from "framer-motion";




function AppContent() {
  const { isAuthenticated } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showECGMonitor, setShowECGMonitor] = useState(false);

  const pageVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4,
  };

  // Si se muestra el monitor ECG
  if (showECGMonitor) {
    return (
      <motion.div
        key="ecg-monitor"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        <ECGMonitor onBack={() => setShowECGMonitor(false)} />
      </motion.div>
    );
  }

  // Si el usuario está autenticado, mostrar el dashboard

if (isAuthenticated) {
  return (
    <motion.div
      key="ecg-monitor"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <ECGMonitor onBack={() => { setShowAuth(false); setShowECGMonitor(false); }} />
    </motion.div>
  );
}


  // Si se clickeó en Admin, mostrar la página de autenticación
if (showAuth) {
  return (
    <motion.div
      key="auth"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <AuthPage onBack={() => setShowAuth(false)} />
    </motion.div>
  );
}


  // Mostrar la landing page normal
  return (
    <motion.div
      key="landing"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="min-h-screen bg-white"
    >
      <main>
      <Hero onMonitorClick={() => setShowAuth(true)} />
        <About />
        <Services />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
      <Toaster />
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <AppContent />
      </AnimatePresence>
    </AuthProvider>
  );
}
