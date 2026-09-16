process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = 'https://pgpobxvkojawrstadrel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncG9ieHZrb2phd3JzdGFkcmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMzUwMiwiZXhwIjoyMDgyNjg5NTAyfQ.SOOLOrQjQ6n7NjM-o7-WR-I0YclZRR_sNW555ZYCZ3I';

async function main() {
  console.log('=== CONFIGURANDO TENANT BRILHO MÁGICO E OS 11 SERVIÇOS OFICIAIS ===');

  // 1. Buscar todos os tenants
  const tRes = await fetch(`${supabaseUrl}/rest/v1/tenants?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const tenants = await tRes.json();
  console.log('Tenants:', JSON.stringify(tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })), null, 2));

  // Identificar ou configurar o tenant com slug 'brilho-magico'
  let targetTenant = tenants.find(t => t.slug === 'brilho-magico');
  if (!targetTenant) {
    // Escolher o tenant de onboarding/piloto mais recente e renomear/atualizar seu slug para 'brilho-magico'
    const chosenTenant = tenants.find(t => t.slug === 'teste-05-onboard-mtutzort') || tenants[0];
    console.log(`Atualizando tenant ${chosenTenant.id} para slug 'brilho-magico' e nome 'Brilho Mágico'...`);
    
    await fetch(`${supabaseUrl}/rest/v1/tenants?id=eq.${chosenTenant.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: 'Brilho Mágico',
        slug: 'brilho-magico',
        address: 'Avenida Florips Crispim, N 644 - Bairro Novo Panorama, Salinas MG',
        phone: '(38) 99999-0505',
        status: 'active'
      })
    });

    targetTenant = { ...chosenTenant, name: 'Brilho Mágico', slug: 'brilho-magico' };
  }

  console.log(`Tenant oficial ativo: [${targetTenant.name}] - ID: ${targetTenant.id} - Slug: ${targetTenant.slug}`);

  // 11 Serviços Oficiais
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

  // Buscar serviços do tenant
  const servRes = await fetch(`${supabaseUrl}/rest/v1/services?tenant_id=eq.${targetTenant.id}&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const currentServices = await servRes.json();

  // Para cada serviço oficial, garantir que existe e está com os valores exatos
  for (const s of officialServices) {
    const match = currentServices.find(cs => cs.name.trim().toLowerCase() === s.name.trim().toLowerCase() && cs.vehicle_type === s.vehicle_type);
    if (match) {
      console.log(`Atualizando [${s.name}] (id: ${match.id}) -> Preço: R$ ${s.price}, Tipo: ${s.vehicle_type}`);
      await fetch(`${supabaseUrl}/rest/v1/services?id=eq.${match.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: s.name,
          vehicle_type: s.vehicle_type,
          price: s.price,
          duration_minutes: s.duration_minutes,
          is_active: true
        })
      });
    } else {
      console.log(`Inserindo novo [${s.name}] -> Preço: R$ ${s.price}, Tipo: ${s.vehicle_type}`);
      await fetch(`${supabaseUrl}/rest/v1/services`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: targetTenant.id,
          name: s.name,
          vehicle_type: s.vehicle_type,
          price: s.price,
          duration_minutes: s.duration_minutes,
          is_active: true
        })
      });
    }
  }

  // Desativar ou remover serviços obsoletos com outros nomes do tenant se existirem
  const refreshedServRes = await fetch(`${supabaseUrl}/rest/v1/services?tenant_id=eq.${targetTenant.id}&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const allRefreshed = await refreshedServRes.json();
  for (const cs of allRefreshed) {
    const isOfficial = officialServices.some(os => os.name.trim().toLowerCase() === cs.name.trim().toLowerCase() && os.vehicle_type === cs.vehicle_type);
    if (!isOfficial) {
      console.log(`Desativando serviço não-oficial: [${cs.name}] (${cs.id})`);
      await fetch(`${supabaseUrl}/rest/v1/services?id=eq.${cs.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: false })
      });
    }
  }

  // Testar a RPC get_public_tenant_by_slug('brilho-magico')
  const rpcTest = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_tenant_by_slug`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_slug: 'brilho-magico' })
  });
  const rpcData = await rpcTest.json();
  console.log('\nTeste RPC p_slug="brilho-magico":', JSON.stringify(rpcData, null, 2));

  // Buscar serviços ativos finais
  const finalServicesRes = await fetch(`${supabaseUrl}/rest/v1/services?tenant_id=eq.${targetTenant.id}&is_active=eq.true&order=vehicle_type.asc,price.asc&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const finalServices = await finalServicesRes.json();
  console.log(`\n=== SERVIÇOS ATIVOS DA BRILHO MÁGICO (${finalServices.length}) ===`);
  console.log(JSON.stringify(finalServices.map(s => ({
    name: s.name,
    vehicle_type: s.vehicle_type,
    price: `R$ ${Number(s.price).toFixed(2)}`,
    duration: `${s.duration_minutes} min`
  })), null, 2));
}

main().catch(err => console.error(err));
