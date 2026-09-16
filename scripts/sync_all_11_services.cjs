process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = 'https://pgpobxvkojawrstadrel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncG9ieHZrb2phd3JzdGFkcmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMzUwMiwiZXhwIjoyMDgyNjg5NTAyfQ.SOOLOrQjQ6n7NjM-o7-WR-I0YclZRR_sNW555ZYCZ3I';

async function main() {
  console.log('=== AUDITANDO TENANTS E SERVIÇOS NO SUPABASE ===');

  const tRes = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id,name,slug`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const tenants = await tRes.json();
  console.log('Tenants:', JSON.stringify(tenants, null, 2));

  // 11 Serviços Oficiais do Brilho Mágico
  const officialServices = [
    // CARROS (8)
    { name: 'Lavagem Básica', vehicle_type: 'CARRO', price: 70.00, duration_minutes: 45 },
    { name: 'Lavagem por Baixo', vehicle_type: 'CARRO', price: 80.00, duration_minutes: 45 },
    { name: 'Lavagem com Revitalização de Plásticos', vehicle_type: 'CARRO', price: 120.00, duration_minutes: 60 },
    { name: 'Lavagem com Cera', vehicle_type: 'CARRO', price: 130.00, duration_minutes: 60 },
    { name: 'Lavagem com Cera + Revitalização de Plásticos', vehicle_type: 'CARRO', price: 150.00, duration_minutes: 75 },
    { name: 'Lavagem de Motor', vehicle_type: 'CARRO', price: 150.00, duration_minutes: 60 },
    { name: 'Higienização sem Remoção de Bancos', vehicle_type: 'CARRO', price: 250.00, duration_minutes: 120 },
    { name: 'Higienização com Remoção de Bancos, Carpete e Teto', vehicle_type: 'CARRO', price: 600.00, duration_minutes: 240 },
    
    // MOTOS (3)
    { name: 'Lavagem Básica + Verniz', vehicle_type: 'MOTO', price: 40.00, duration_minutes: 30 },
    { name: 'Lavagem com Detmol + Verniz', vehicle_type: 'MOTO', price: 50.00, duration_minutes: 45 },
    { name: 'Lavagem Completa com Revitalização de Plásticos + Verniz', vehicle_type: 'MOTO', price: 80.00, duration_minutes: 60 }
  ];

  // Verificar se existe tenant com slug brilho-magico
  let brilhoMagicoTenant = tenants.find(t => t.slug === 'brilho-magico' || t.name === 'Brilho Mágico');
  if (!brilhoMagicoTenant) {
    console.log('Tenant "brilho-magico" não encontrado pelo slug exato. Verificando tenants existentes...');
    // Se não existir, verificar se criamos ou vinculamos aos tenants existentes
  }

  for (const tenant of tenants) {
    console.log(`\n--- Sincronizando para Tenant: [${tenant.name}] (${tenant.id} - ${tenant.slug}) ---`);

    // Buscar serviços existentes deste tenant
    const existingRes = await fetch(`${supabaseUrl}/rest/v1/services?tenant_id=eq.${tenant.id}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    const existingServices = await existingRes.json();
    console.log(`Serviços atuais no tenant: ${existingServices.length}`);

    for (const off of officialServices) {
      // Comparar por nome exato ou normalizado
      const match = existingServices.find(s => 
        s.name.toLowerCase().trim() === off.name.toLowerCase().trim() ||
        (s.name.toLowerCase().includes(off.name.toLowerCase()) && s.vehicle_type === off.vehicle_type)
      );

      if (match) {
        console.log(`  -> Atualizando serviço existente [${match.name}] (id: ${match.id}) -> Preço: R$ ${off.price}, Tipo: ${off.vehicle_type}...`);
        await fetch(`${supabaseUrl}/rest/v1/services?id=eq.${match.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            name: off.name,
            vehicle_type: off.vehicle_type,
            price: off.price,
            duration_minutes: off.duration_minutes,
            is_active: true
          })
        });
      } else {
        console.log(`  -> Inserindo novo serviço [${off.name}] -> Preço: R$ ${off.price}, Tipo: ${off.vehicle_type}...`);
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
            name: off.name,
            vehicle_type: off.vehicle_type,
            price: off.price,
            duration_minutes: off.duration_minutes,
            is_active: true
          })
        });
      }
    }
  }

  // Se tenant com slug 'brilho-magico' precisar de tenant específico
  const finalCheck = await fetch(`${supabaseUrl}/rest/v1/services?select=id,tenant_id,name,vehicle_type,price,duration_minutes,is_active&order=vehicle_type.asc,price.asc`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const allFinal = await finalCheck.json();
  console.log(`\n=== TOTAL DE SERVIÇOS NO BANCO APÓS SINCRONIZAÇÃO: ${allFinal.length} ===`);
  console.log(JSON.stringify(allFinal, null, 2));
}

main().catch(err => console.error(err));
