import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  console.log("Triggering scheduler cycle manually...");
  try {
    const { runSchedulerCycle } = await import('../lib/scheduler/scheduler');
    await runSchedulerCycle();
    console.log("Scheduler cycle finished.");
  } catch (err: any) {
    console.error("Failed to run scheduler cycle:", err);
  }
}

run();
