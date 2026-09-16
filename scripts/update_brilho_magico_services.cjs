process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = 'https://pgpobxvkojawrstadrel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncG9ieHZrb2phd3JzdGFkcmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMzUwMiwiZXhwIjoyMDgyNjg5NTAyfQ.SOOLOrQjQ6n7NjM-o7-WR-I0YclZRR_sNW555ZYCZ3I';

async function main() {
  console.log('--- INSERINDO / ATUALIZANDO SERVIÇOS NO SUPABASE ---');

  const tRes = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id,name,slug`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const tenants = await tRes.json();
  console.log(`Tenants encontrados: ${tenants.length}`);

  const servicesToInsert = [
    {
      name: 'Lavada Básica + Verniz',
      vehicle_type: 'MOTO',
      price: 40.00,
      duration_minutes: 30,
      is_active: true
    },
    {
      name: 'Lavada com Detmol + Verniz',
      vehicle_type: 'MOTO',
      price: 50.00,
      duration_minutes: 45,
      is_active: true
    },
    {
      name: 'Lavada Completa Revitalização + Verniz com Detmol',
      vehicle_type: 'MOTO',
      price: 80.00,
      duration_minutes: 60,
      is_active: true
    }
  ];

  for (const tenant of tenants) {
    console.log(`Tenant: [${tenant.name}] (${tenant.id})`);

    for (const s of servicesToInsert) {
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/services?tenant_id=eq.${tenant.id}&name=eq.${encodeURIComponent(s.name)}&select=id`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      const existing = await checkRes.json();

      if (Array.isArray(existing) && existing.length > 0) {
        console.log(`  -> Atualizando "${s.name}" (id: ${existing[0].id}) para R$ ${s.price}...`);
        await fetch(`${supabaseUrl}/rest/v1/services?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            price: s.price,
            vehicle_type: s.vehicle_type,
            duration_minutes: s.duration_minutes,
            is_active: true
          })
        });
      } else {
        console.log(`  -> Inserindo "${s.name}" - R$ ${s.price}...`);
        await fetch(`${supabaseUrl}/rest/v1/services`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            tenant_id: tenant.id,
            name: s.name,
            vehicle_type: s.vehicle_type,
            price: s.price,
            duration_minutes: s.duration_minutes,
            is_active: true
          })
        });
      }
    }
  }

  const sRes = await fetch(`${supabaseUrl}/rest/v1/services?select=id,tenant_id,name,vehicle_type,price,duration_minutes,is_active&order=price.asc`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const allServices = await sRes.json();
  console.log('\n=== SERVIÇOS ATUAIS NO BANCO ===');
  console.log(JSON.stringify(allServices, null, 2));
}

main().catch(err => console.error(err));
