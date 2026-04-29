import React from 'react';
import { Clock, Globe, Calendar, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StepBusinessHoursProps {
  timezone: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
  onTimezoneChange: (value: string) => void;
  onBusinessHoursStartChange: (value: string) => void;
  onBusinessHoursEndChange: (value: string) => void;
  onBusinessDaysChange: (value: number[]) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
};

const TIMEZONES = [
  { id: 'America/Sao_Paulo', name: 'São Paulo (GMT-3)', short: 'BRT' },
  { id: 'America/Fortaleza', name: 'Fortaleza (GMT-3)', short: 'BRT' },
  { id: 'America/Manaus', name: 'Manaus (GMT-4)', short: 'AMT' },
  { id: 'America/Rio_Branco', name: 'Rio Branco (GMT-5)', short: 'ACT' },
  { id: 'America/Noronha', name: 'Fernando de Noronha (GMT-2)', short: 'FNT' },
  { id: 'America/New_York', name: 'Nova York (GMT-5)', short: 'EST' },
  { id: 'America/Los_Angeles', name: 'Los Angeles (GMT-8)', short: 'PST' },
  { id: 'Europe/Lisbon', name: 'Lisboa (GMT+0)', short: 'WET' },
  { id: 'Europe/London', name: 'Londres (GMT+0)', short: 'GMT' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { id: `${hour}:00`, name: `${hour}:00` };
});

const DAYS = [
  { id: 0, name: 'Dom', fullName: 'Domingo' },
  { id: 1, name: 'Seg', fullName: 'Segunda' },
  { id: 2, name: 'Ter', fullName: 'Terça' },
  { id: 3, name: 'Qua', fullName: 'Quarta' },
  { id: 4, name: 'Qui', fullName: 'Quinta' },
  { id: 5, name: 'Sex', fullName: 'Sexta' },
  { id: 6, name: 'Sáb', fullName: 'Sábado' },
];

export const StepBusinessHours: React.FC<StepBusinessHoursProps> = ({
  timezone,
  businessHoursStart,
  businessHoursEnd,
  businessDays,
  onTimezoneChange,
  onBusinessHoursStartChange,
  onBusinessHoursEndChange,
  onBusinessDaysChange,
}) => {
  const toggleDay = (dayId: number) => {
    if (businessDays.includes(dayId)) {
      onBusinessDaysChange(businessDays.filter(d => d !== dayId));
    } else {
      onBusinessDaysChange([...businessDays, dayId].sort());
    }
  };

  const selectedTimezone = TIMEZONES.find(tz => tz.id === timezone);
  const formattedDays = DAYS.filter(d => businessDays.includes(d.id)).map(d => d.name).join(', ');

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Clock className="w-8 h-8 text-orange-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Horário Comercial</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Configure quando seu agente estará disponível para atender.
        </p>
        <p className="text-xs text-amber-400/80 mt-2">
          ⚡ Esta configuração é opcional
        </p>
      </motion.div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Timezone */}
        <motion.div variants={itemVariants} className="space-y-2">
          <Label className="text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            Fuso Horário
          </Label>
          <Select value={timezone} onValueChange={onTimezoneChange}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Selecione o fuso horário">
                {selectedTimezone?.name || 'Selecione o fuso horário'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 z-50">
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.id} value={tz.id} className="text-white hover:bg-violet-500/20 focus:bg-violet-500/20 focus:text-white">
                  {tz.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Business Hours */}
        <motion.div variants={itemVariants} className="space-y-3">
          <Label className="text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Horário de Atendimento
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Início</span>
              <Select value={businessHoursStart} onValueChange={onBusinessHoursStartChange}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60 z-50">
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.id} value={hour.id} className="text-white hover:bg-violet-500/20 focus:bg-violet-500/20 focus:text-white">
                      {hour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Fim</span>
              <Select value={businessHoursEnd} onValueChange={onBusinessHoursEndChange}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60 z-50">
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.id} value={hour.id} className="text-white hover:bg-violet-500/20 focus:bg-violet-500/20 focus:text-white">
                      {hour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Business Days */}
        <motion.div variants={itemVariants} className="space-y-3">
          <Label className="text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            Dias de Atendimento
          </Label>
          <div className="flex gap-2 justify-center">
            {DAYS.map((day) => (
              <motion.button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`
                  w-10 h-10 rounded-lg text-sm font-medium transition-all
                  ${businessDays.includes(day.id)
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-orange-500/50'
                  }
                `}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={day.fullName}
              >
                {day.name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Preview */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <Eye className="w-3 h-3" />
            Preview do Horário
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-slate-300">
              <span className="text-slate-500">Fuso:</span>{' '}
              <span className="text-white font-medium">{selectedTimezone?.short || timezone}</span>
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Horário:</span>{' '}
              <span className="text-orange-400 font-medium">{businessHoursStart} - {businessHoursEnd}</span>
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Dias:</span>{' '}
              <span className="text-white font-medium">{formattedDays || 'Nenhum selecionado'}</span>
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
