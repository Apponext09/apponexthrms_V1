const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function inspectNotificationTemplates() {
  console.log('====================================================');
  console.log('  📜 INSPECTING NOTIFICATION TEMPLATES IN MYSQL DB   ');
  console.log('====================================================\n');

  const templates = await db('notification_templates').select('*');
  console.log(`Found ${templates.length} template(s):`);
  for (const t of templates) {
    console.log(`\nID=${t.id} | Code="${t.event_code || t.code}" | Name="${t.template_name || t.name}"`);
    console.log(`Subject Template: "${t.subject_line || t.subject}"`);
    console.log(`Body Template: "${t.body_text || t.body || t.content}"`);
  }

  const notifs = await db('notifications').orderBy('created_at', 'desc').limit(5);
  console.log(`\nFound ${notifs.length} recent notification(s) in notifications table:`);
  for (const n of notifs) {
    console.log(`\nNotif ID=${n.id} | RecipientID=${n.recipient_id} | Event="${n.event_code}"`);
    console.log(`Subject: "${n.subject_line}"`);
    console.log(`Body: "${n.body_text}"`);
    console.log(`Variables: "${n.variables}"`);
  }

  await db.destroy();
  process.exit(0);
}

inspectNotificationTemplates();
