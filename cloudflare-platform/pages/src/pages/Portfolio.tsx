import { motion } from 'framer-motion';
import { FiPieChart } from 'react-icons/fi';

export default function Portfolio() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold gradient-text">Portfolio Management</h1>
        <p className="text-slate-400 mt-1">Track and manage your energy portfolio</p>
      </div>
      <div className="chart-glass p-12 text-center">
        <FiPieChart className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Portfolio Overview</h2>
        <p className="text-slate-400">Your portfolio management tools will appear here.</p>
      </div>
    </motion.div>
  );
}
