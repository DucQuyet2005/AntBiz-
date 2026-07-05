async function run() {
  const url = 'https://nttnyvgprhbthsqmvyjp.supabase.co/rest/v1/scheduled_posts?select=id,platform,status,scheduled_at,fb_post_id,threads_post_id,created_at,captions(id,platform,ai_content)&created_at=gt.2026-07-04T00:00:00Z';
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dG55dmdwcmhidGhzcW12eWpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NDk0MCwiZXhwIjoyMDk3MTYwOTQwfQ.immAU5diyiQR-b6xH_6nRQvZnDgk8v-qTZ9pLss8ctM',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dG55dmdwcmhidGhzcW12eWpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4NDk0MCwiZXhwIjoyMDk3MTYwOTQwfQ.immAU5diyiQR-b6xH_6nRQvZnDgk8v-qTZ9pLss8ctM'
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log('Posts after July 4th:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
