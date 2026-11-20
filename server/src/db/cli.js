import { db } from './knex.js';

const [command, name] = process.argv.slice(2);

async function run() {
  switch (command) {
    case 'migrate': {
      const [batch, files] = await db.migrate.latest();
      console.log(files.length ? `Batch ${batch}: ${files.join(', ')}` : 'Already up to date');
      break;
    }
    case 'rollback': {
      const [batch, files] = await db.migrate.rollback();
      console.log(files.length ? `Rolled back batch ${batch}: ${files.join(', ')}` : 'Nothing to roll back');
      break;
    }
    case 'make': {
      if (!name) throw new Error('Usage: npm run migrate:make -- <name>');
      const file = await db.migrate.make(name, { extension: 'js' });
      console.log(`Created ${file}`);
      break;
    }
    case 'seed': {
      const [files] = await db.seed.run();
      console.log(`Ran seeds: ${files.join(', ')}`);
      break;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
