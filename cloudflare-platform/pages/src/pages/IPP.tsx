import { motion } from 'framer-motion';
import { FiZap } from 'react-icons/fi';

export default function IPP() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold gradient-text">IPP Projects</h1>
        <p className="text-slate-400 mt-1">Independent Power Producer project management</p>
      </div>
      <div className="chart-glass p-12 text-center">
        <FiZap className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">IPP Project Dashboard</h2>
        <p className="text-slate-400">Your IPP projects and power generation data will appear here.</p>
      </div>
    </motion.div>
  );
}
