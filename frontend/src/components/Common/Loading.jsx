import { motion } from 'framer-motion'

export default function Loading({ fullScreen = true }) {
  const content = (
    <div className="flex items-center justify-center space-x-2">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="w-3 h-3 bg-primary-600 rounded-full"
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.6, delay: 0.1, repeat: Infinity }}
        className="w-3 h-3 bg-primary-600 rounded-full"
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.6, delay: 0.2, repeat: Infinity }}
        className="w-3 h-3 bg-primary-600 rounded-full"
      />
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        {content}
      </div>
    )
  }

  return <div className="flex items-center justify-center py-12">{content}</div>
}