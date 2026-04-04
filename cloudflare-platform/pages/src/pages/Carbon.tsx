import { motion } from 'framer-motion';
import { FiGlobe } from 'react-icons/fi';

export default function Carbon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold gradient-text">Carbon Credits</h1>
        <p className="text-slate-400 mt-1">Carbon credit marketplace and tracking</p>
      </div>
      <div className="chart-glass p-12 text-center">
        <FiGlobe className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Carbon Credit Marketplace</h2>
        <p className="text-slate-400">Your carbon credits and sustainability tools will appear here.</p>
      </div>
    </motion.div>
  );
}
