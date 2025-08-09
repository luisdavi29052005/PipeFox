
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Clock, Ban } from 'lucide-react';

interface ErrorsPanelProps {
  errors: Array<{
    reason: string;
    count: number;
  }>;
}

export default function ErrorsPanel({ errors }: ErrorsPanelProps) {
  const getErrorIcon = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'captcha': return Shield;
      case 'checkpoint': return AlertTriangle;
      case 'rate_limit': return Clock;
      case 'permission': return Ban;
      default: return AlertTriangle;
    }
  };

  const getErrorColor = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'captcha': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'checkpoint': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'rate_limit': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'permission': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getErrorLabel = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'captcha': return 'Captcha';
      case 'checkpoint': return 'Checkpoint';
      case 'rate_limit': return 'Limite de Taxa';
      case 'permission': return 'Permissão';
      default: return reason;
    }
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Erros 24h
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Principais falhas do sistema
        </p>
      </div>

      {errors.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Nenhum erro nas últimas 24h</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((error, index) => {
            const IconComponent = getErrorIcon(error.reason);
            const colorClasses = getErrorColor(error.reason);
            
            return (
              <motion.div
                key={error.reason}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-md ${colorClasses}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getErrorLabel(error.reason)}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {error.count}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
