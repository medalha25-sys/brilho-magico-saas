process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = 'https://pgpobxvkojawrstadrel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncG9ieHZrb2phd3JzdGFkcmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMzUwMiwiZXhwIjoyMDgyNjg5NTAyfQ.SOOLOrQjQ6n7NjM-o7-WR-I0YclZRR_sNW555ZYCZ3I';

async function main() {
  console.log('--- TESTANDO RPC get_public_tenant_by_slug ---');
  
  const slugs = ['brilho-magico', 'wash-express', 'teste-05-onboard-mtutzort', 'teste-onboarding-real-01', 'teste-lava-rapido-salinas-a'];
  for (const s of slugs) {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_tenant_by_slug`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_slug: s })
    });
    const data = await res.json();
    console.log(`Slug [${s}]:`, JSON.stringify(data));
  }
}

main().catch(err => console.error(err));
