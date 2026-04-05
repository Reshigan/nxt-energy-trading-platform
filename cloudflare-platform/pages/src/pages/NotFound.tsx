import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function NotFound() {
  const tc = useThemeClasses();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full py-12"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-600/20 to-blue-600/20 flex items-center justify-center"
        >
          <span className={`text-4xl font-bold ${tc.textPrimary}`}>404</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`text-3xl font-bold ${tc.textPrimary} mb-4`}
        >
          Page Not Found
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-slate-400 mb-8 max-w-md mx-auto"
        >
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/"
            className="flex items-center px-6 py-3 glass rounded-lg hover:bg-slate-700 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <Link
            to="/"
            className="flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:opacity-90 transition-opacity"
          >
            <FiHome className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}