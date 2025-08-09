
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface AccountsHealthProps {
  accounts: Array<{
    id: string;
    name: string;
    status: string;
    health: string;
    last_seen_at: string;
    errors_24h: number;
  }>;
}

export default function AccountsHealth({ accounts }: AccountsHealthProps) {
  const getHealthIcon = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'ok': return CheckCircle;
      case 'checkpoint': return AlertTriangle;
      case 'captcha': return XCircle;
      case 'blocked': return XCircle;
      default: return Clock;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'ok': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'checkpoint': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'captcha': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'blocked': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getHealthLabel = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'ok': return 'Saudável';
      case 'checkpoint': return 'Checkpoint';
      case 'captcha': return 'Captcha';
      case 'blocked': return 'Bloqueado';
      default: return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'logging_in': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'conflict': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready': return 'Pronta';
      case 'logging_in': return 'Logando';
      case 'error': return 'Erro';
      case 'conflict': return 'Conflito';
      default: return 'Desconhecido';
    }
  };

  const formatLastSeen = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Agora';
    if (diffHours === 1) return '1h atrás';
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 dia atrás';
    return `${diffDays} dias atrás`;
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Saúde das Contas
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Status e último acesso das contas
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Nenhuma conta configurada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account, index) => {
            const HealthIcon = getHealthIcon(account.health);
            const healthColor = getHealthColor(account.health);
            const statusColor = getStatusColor(account.status);
            
            return (
              <motion.div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${healthColor}`}>
                    <HealthIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {account.name}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                        {getStatusLabel(account.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatLastSeen(account.last_seen_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {getHealthLabel(account.health)}
                  </div>
                  {account.errors_24h > 0 && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {account.errors_24h} erros 24h
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
