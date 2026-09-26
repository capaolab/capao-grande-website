import * as migration_20260925_155109_initial from './20260925_155109_initial';
import * as migration_20260926_113113_etiquetas from './20260926_113113_etiquetas';
import * as migration_20260926_113524_capa_unsplash from './20260926_113524_capa_unsplash';
import * as migration_20260926_113948_secoes_cardapio from './20260926_113948_secoes_cardapio';
import * as migration_20260926_114349_caixa_contas_fechadas from './20260926_114349_caixa_contas_fechadas';

export const migrations = [
  {
    up: migration_20260925_155109_initial.up,
    down: migration_20260925_155109_initial.down,
    name: '20260925_155109_initial',
  },
  {
    up: migration_20260926_113113_etiquetas.up,
    down: migration_20260926_113113_etiquetas.down,
    name: '20260926_113113_etiquetas',
  },
  {
    up: migration_20260926_113524_capa_unsplash.up,
    down: migration_20260926_113524_capa_unsplash.down,
    name: '20260926_113524_capa_unsplash',
  },
  {
    up: migration_20260926_113948_secoes_cardapio.up,
    down: migration_20260926_113948_secoes_cardapio.down,
    name: '20260926_113948_secoes_cardapio',
  },
  {
    up: migration_20260926_114349_caixa_contas_fechadas.up,
    down: migration_20260926_114349_caixa_contas_fechadas.down,
    name: '20260926_114349_caixa_contas_fechadas'
  },
];
