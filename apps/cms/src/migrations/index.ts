import * as migration_20261103_035530 from './20261103_035530';
import * as migration_20261103_054930_modular_system from './20261103_054930_modular_system';

import * as ai from './20261103_060000_ai_limits';
import * as integrations from './20261103_150000_integrations';
import * as backupAdmin from './20261104_010000_backup_admin';
import * as faqAssistant from './20261104_030000_faq_assistant';
export const migrations = [
  {
    up: migration_20261103_035530.up,
    down: migration_20261103_035530.down,
    name: '20261103_035530',
  },
  {
    up: migration_20261103_054930_modular_system.up,
    down: migration_20261103_054930_modular_system.down,
    name: '20261103_054930_modular_system'
  },
 {up:ai.up,down:ai.down,name:'20261103_060000_ai_limits'},
 {up:integrations.up,down:integrations.down,name:'20261103_150000_integrations'},
 {up:backupAdmin.up,down:backupAdmin.down,name:'20261104_010000_backup_admin'},
 {up:faqAssistant.up,down:faqAssistant.down,name:'20261104_030000_faq_assistant'},
];
