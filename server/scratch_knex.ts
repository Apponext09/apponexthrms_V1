import { getKnex } from './src/db/knex';
getKnex()('attendance_regularizations').columnInfo().then(info => {
  console.log(Object.keys(info));
  process.exit();
}).catch(console.error);
