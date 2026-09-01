"use client";

import React, { useState, useEffect, use } from 'react';
import { 
  Calendar, 
  Car, 
  Bike, 
  Clock, 
  Check, 
  User, 
  Phone, 
  Tag, 
  MessageSquare, 
  ArrowLeft, 
  FileText,
  Share2,
  Award,
  Sparkles,
  Info,
  X,
  Search,
  Star,
  Lock,
  QrCode,
  Copy,
  Banknote,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  vehicleType: 'CARRO' | 'MOTO';
}

const TIME_SLOTS_MOCK = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];

// Gerador oficial de código Pix Copia e Cola (Padrão Banco Central BR Code EMV com CRC16)
function getCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload({
  key = '10751043605',
  name = 'Claudio Pereira Junior',
  city = 'Salinas',
  amount = 0,
  txid = 'BRILHO'
}: {
  key?: string;
  name?: string;
  city?: string;
  amount?: number;
  txid?: string;
}): string {
  const cleanKey = key.replace(/\D/g, '') || key;
  const cleanName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25);
  const cleanCity = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15);
  const formattedAmount = amount > 0 ? amount.toFixed(2) : '';

  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const merchantAccount = 
    formatField('00', 'br.gov.bcb.pix') +
    formatField('01', cleanKey);

  const payload = 
    formatField('00', '01') +
    formatField('26', merchantAccount) +
    formatField('52', '0000') +
    formatField('53', '986') +
    (formattedAmount ? formatField('54', formattedAmount) : '') +
    formatField('58', 'BR') +
    formatField('59', cleanName) +
    formatField('60', cleanCity) +
    formatField('62', formatField('05', txid.slice(0, 25) || '***')) +
    '6304';

  const crc = getCRC16(payload);
  return `${payload}${crc}`;
}

export default function BookingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vehicleType, setVehicleType] = useState<'CARRO' | 'MOTO' | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Dados do Agendamento
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [wantCpf, setWantCpf] = useState(false);
  
  // Formas de Pagamento Obrigatórias: 1º PIX, 2º Dinheiro, 3º Cartão (Crédito / Débito)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'DINHEIRO' | 'CARTAO'>('PIX');
  const [cardType, setCardType] = useState<'CREDITO' | 'DEBITO'>('CREDITO');
  const [needChange, setNeedChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const [pixKeyCopied, setPixKeyCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customerPoints, setCustomerPoints] = useState<number>(0);

  // Modal de Consulta de Pontos
  const [isCheckPointsOpen, setIsCheckPointsOpen] = useState(false);
  const [queryPhone, setQueryPhone] = useState('');
  const [queryResult, setQueryResult] = useState<{ name: string; points: number } | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [querySearched, setQuerySearched] = useState(false);

  // Modal de Regras de Fidelidade
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Modal de Feedback & Avaliação (5 Estrelas - Mínimo 50 caracteres)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number>(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [starWarning, setStarWarning] = useState(false);

  // Estados dinâmicos do Supabase
  const [services, setServices] = useState<Service[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ [key: string]: string[] }>({});
  const [loadingData, setLoadingData] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo_url: string; address: string } | null>(null);

  // 1. Carrega dados dinâmicos do Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, name, logo_url, address')
          .eq('slug', tenantSlug)
          .single();
        
        if (!tenantData) {
          console.warn("Lava-rápido não cadastrado. Usando serviços padrão de teste.");
          setTenantInfo({
            name: 'Brilho Mágico',
            logo_url: '/logo.jpg',
            address: 'Avenida Florips Crispim, N 644 - Bairro Novo Panorama, Salinas MG'
          });
          setServices([
            { id: '1', name: 'Limpeza Interna', price: 70.00, duration: 50, vehicleType: 'CARRO' },
            { id: '2', name: 'Lavada Top', price: 150.00, duration: 90, vehicleType: 'CARRO' },
            { id: '3', name: 'Lavada Mais Complexa', price: 300.00, duration: 150, vehicleType: 'CARRO' },
            { id: '4', name: 'Ducha Simples Moto', price: 30.00, duration: 30, vehicleType: 'MOTO' },
            { id: '5', name: 'Lavagem Completa Moto', price: 50.00, duration: 50, vehicleType: 'MOTO' },
          ]);
          setLoadingData(false);
          return;
        }

        setTenantInfo({
          name: tenantData.name,
          logo_url: tenantData.logo_url || '/logo.jpg',
          address: tenantData.address || 'Avenida Florips Crispim, N 644 - Bairro Novo Panorama, Salinas MG'
        });

        // Busca todos os serviços ativos diretamente do Supabase
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (servicesData && servicesData.length > 0) {
          setServices(servicesData.map(s => ({
            id: s.id,
            name: s.name,
            price: Number(s.price),
            duration: s.duration_minutes,
            vehicleType: s.vehicle_type as 'CARRO' | 'MOTO'
          })));
        }

        // Busca agendamentos dos próximos 7 dias para mapear horários bloqueados
        const todayStr = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('scheduled_at')
          .eq('tenant_id', tenantData.id)
          .gte('scheduled_at', todayStr)
          .lte('scheduled_at', nextWeekStr);

        if (appointmentsData) {
          const booked: { [key: string]: string[] } = {};
          appointmentsData.forEach((app) => {
            const dateObj = new Date(app.scheduled_at);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}-${mm}-${dd}`;
            
            const hh = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            const timeKey = `${hh}:${min}`;

            if (!booked[dateKey]) {
              booked[dateKey] = [];
            }
            booked[dateKey].push(timeKey);
          });
          setBookedSlots(booked);
        }
      } catch (err) {
        console.error("Erro ao carregar banco de dados:", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [tenantSlug]);

  // Helpers de Compartilhamento
  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return `https://brilho-magico-saas.vercel.app/agendar/${tenantSlug}`;
  };

  const getShareText = () => {
    const name = tenantInfo?.name || 'Brilho Mágico';
    return `🚗 Olá! Agende a lavagem do seu carro ou moto na ${name} 100% online, sem filas e ganhe pontos no Cartão Fidelidade:\n👉 ${getShareUrl()}`;
  };

  const handleNativeShare = async () => {
    const text = getShareText();
    const url = getShareUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${tenantInfo?.name || 'Brilho Mágico'} - Agendamento Online`,
          text: text,
          url: url
        });
      } catch (err) {
        console.log('Compartilhamento cancelado:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Consulta manual de pontos do cliente por WhatsApp
  const handleSearchPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = queryPhone.replace(/\D/g, '');
    if (clean.length < 8) return;

    setQueryLoading(true);
    setQuerySearched(true);
    setQueryResult(null);

    try {
      const searchKey = clean.length >= 10 ? clean.slice(-10) : clean;

      // 1. Busca cadastro do cliente (sem selecionar a coluna points para não falhar no Supabase)
      const { data: customerList } = await supabase
        .from('customers')
        .select('name, phone, notes, vehicle_plate');

      const customer = (customerList || []).find(c => {
        const cClean = (c.phone || '').replace(/\D/g, '');
        const cKey = cClean.length >= 10 ? cClean.slice(-10) : cClean;
        return cKey === searchKey;
      });

      // 2. Busca também os agendamentos finalizados deste telefone
      const { data: finalizedApps } = await supabase
        .from('appointments')
        .select('customer_name, customer_phone, vehicle_plate')
        .eq('status', 'FINALIZADO');

      const finalMatches = (finalizedApps || []).filter(a => {
        const aClean = (a.customer_phone || '').replace(/\D/g, '');
        const aKey = aClean.length >= 10 ? aClean.slice(-10) : aClean;
        return aKey === searchKey;
      });

      // Extrai resgates salvos
      let redeemed = 0;
      if (customer?.notes) {
        const match = customer.notes.match(/\[RESGAT(?:E|ADO):\s*(\d+)\]/i);
        if (match) redeemed = parseInt(match[1], 10) || 0;
      }

      if (customer || finalMatches.length > 0) {
        const computedPts = Math.max(0, finalMatches.length - redeemed);
        const resolvedName = customer?.name || finalMatches[0]?.customer_name || 'Cliente';

        setQueryResult({
          name: resolvedName,
          points: computedPts
        });
      }
    } catch (e) {
      console.error("Erro ao consultar pontos:", e);
    } finally {
      setQueryLoading(false);
    }
  };

  // Seleção de Estrela com Regra Estrita de 50 Caracteres Mínimos
  const handleStarClick = (starNum: number) => {
    if (feedbackComment.trim().length < 50) {
      setStarWarning(true);
      setTimeout(() => setStarWarning(false), 3500);
      return;
    }
    setFeedbackRating(starNum);
    setStarWarning(false);
  };

  // Envio do Feedback do Atendimento
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackComment.trim().length < 50) {
      setStarWarning(true);
      return;
    }
    if (feedbackRating === 0) {
      alert("Por favor, selecione quantas estrelas (de 1 a 5) você dá para a Brilho Mágico.");
      return;
    }

    setFeedbackLoading(true);

    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      const payload = {
        tenant_id: tenantData?.id || null,
        customer_name: feedbackName.trim() || customerName || 'Cliente Brilho Mágico',
        customer_phone: feedbackPhone.trim() || customerPhone || null,
        comment: feedbackComment.trim(),
        rating: feedbackRating
      };

      try {
        await supabase.from('feedbacks').insert(payload);
      } catch (err) {
        console.warn("Aviso ao salvar avaliação no Supabase:", err);
      }

      // Envia notificação instantânea em tempo real para o painel admin
      try {
        const channel = supabase.channel('brilho-magico-realtime');
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'new-feedback',
              payload: {
                id: `fb-${Date.now()}`,
                customer_name: payload.customer_name,
                customer_phone: payload.customer_phone,
                comment: payload.comment,
                rating: payload.rating,
                created_at: new Date().toISOString()
              }
            });
          }
        });
      } catch (rtErr) {
        console.warn("Aviso ao transmitir feedback em tempo real:", rtErr);
      }

      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Erro ao enviar avaliação:", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleVehicleSelect = (type: 'CARRO' | 'MOTO') => {
    setVehicleType(type);
    setSelectedService(null);
  };

  const handleNextStep = () => {
    if (selectedService) {
      setStep(2);
    }
  };

  const handleBackStep = () => {
    setStep(1);
  };

  // Busca se o cliente já possui cadastro anterior ao digitar o WhatsApp
  const handlePhoneBlur = async () => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();

        if (tenantData?.id) {
          const { data: customerList } = await supabase
            .from('customers')
            .select('name, phone, vehicle_plate, cpf, notes')
            .eq('tenant_id', tenantData.id);

          const existingCust = (customerList || []).find(c => {
            const cClean = (c.phone || '').replace(/\D/g, '');
            return cClean === cleanPhone || cClean.endsWith(cleanPhone.slice(-10));
          });

          // Busca agendamentos finalizados para garantir o saldo real de pontos
          const { data: finalizedApps } = await supabase
            .from('appointments')
            .select('customer_name, customer_phone, vehicle_plate, customer_cpf')
            .eq('status', 'FINALIZADO');

          const finalMatches = (finalizedApps || []).filter(a => {
            const aClean = (a.customer_phone || '').replace(/\D/g, '');
            return aClean === cleanPhone || aClean.endsWith(cleanPhone.slice(-10));
          });

          // Extrai pontos resgatados
          let redeemed = 0;
          if (existingCust?.notes) {
            const match = existingCust.notes.match(/\[RESGAT(?:E|ADO):\s*(\d+)\]/i);
            if (match) redeemed = parseInt(match[1], 10) || 0;
          }

          const calculatedPoints = Math.max(0, finalMatches.length - redeemed);

          if (existingCust) {
            if (!customerName && existingCust.name) setCustomerName(existingCust.name);
            if (!vehiclePlate && existingCust.vehicle_plate) setVehiclePlate(existingCust.vehicle_plate);
            if (!customerCpf && existingCust.cpf) {
              setCustomerCpf(existingCust.cpf);
              setWantCpf(true);
            }
            setCustomerPoints(calculatedPoints);
          } else if (finalMatches.length > 0) {
            if (!customerName && finalMatches[0].customer_name) setCustomerName(finalMatches[0].customer_name);
            if (!vehiclePlate && finalMatches[0].vehicle_plate) setVehiclePlate(finalMatches[0].vehicle_plate);
            setCustomerPoints(calculatedPoints);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Helper para gerar o Copia e Cola dinâmico do Pix
  const getPixCode = () => {
    return generatePixPayload({
      key: '10751043605',
      name: 'Claudio Pereira Junior',
      city: 'Salinas',
      amount: selectedService?.price || 0,
      txid: 'BRILHO'
    });
  };

  const handleCopyPixKey = (key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(key);
      setPixKeyCopied(true);
      setTimeout(() => setPixKeyCopied(false), 3000);
    }
  };

  const handleCopyPixPayload = (payload: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const getPaymentMethodLabel = () => {
    if (paymentMethod === 'PIX') return '🟢 PIX (Chave: 10751043605 - Cláudio Pereira Junior)';
    if (paymentMethod === 'DINHEIRO') return `💵 Dinheiro no Balcão${needChange && changeFor ? ` (Troco para ${changeFor})` : ''}`;
    if (paymentMethod === 'CARTAO') return `💳 Cartão de ${cardType === 'CREDITO' ? 'Crédito' : 'Débito'} (Na Maquininha)`;
    return 'PIX';
  };

  // 2. Envia o agendamento e cadastra automaticamente o cliente no Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !customerName || !customerPhone || !vehiclePlate || !selectedService) {
      alert("Por favor, preencha todos os campos obrigatórios (Nome, WhatsApp e Placa do Veículo).");
      return;
    }

    if (!paymentMethod) {
      alert("Por favor, selecione uma forma de pagamento para continuar.");
      return;
    }

    setLoading(true);

    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      if (!tenantData) {
        console.warn("Lava-rápido não encontrado.");
        setLoading(false);
        setStep(3);
        return;
      }

      const cleanPhone = customerPhone.trim();
      const cleanPlate = vehiclePlate.toUpperCase().trim();
      const cleanCpf = wantCpf && customerCpf ? customerCpf.replace(/\D/g, '') : null;

      // 1. Cadastra ou Atualiza o Cliente na tabela de Clientes (customers)
      try {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantData.id)
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existingCust?.id) {
          await supabase
            .from('customers')
            .update({
              name: customerName,
              vehicle_plate: cleanPlate,
              cpf: cleanCpf
            })
            .eq('id', existingCust.id);
        } else {
          await supabase
            .from('customers')
            .insert({
              tenant_id: tenantData.id,
              name: customerName,
              phone: cleanPhone,
              vehicle_plate: cleanPlate,
              cpf: cleanCpf
            });
        }
      } catch (custErr) {
        console.warn("Aviso ao sincronizar cadastro de clientes:", custErr);
      }

      // 2. Combina a data (yyyy-mm-dd) e a hora (hh:mm)
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hour, minute] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(year, month - 1, day, hour, minute).toISOString();

      // 3. Salva na tabela appointments com forma de pagamento
      const paymentInfo = getPaymentMethodLabel();
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          tenant_id: tenantData.id,
          service_id: selectedService.id,
          customer_name: customerName,
          customer_phone: cleanPhone,
          vehicle_plate: cleanPlate,
          customer_cpf: cleanCpf,
          scheduled_at: scheduledAt,
          total_price: selectedService.price,
          status: 'PENDENTE'
        });

      if (insertError) {
        alert("Erro ao salvar agendamento: " + insertError.message);
        setLoading(false);
        return;
      }

      const updatedBooked = { ...bookedSlots };
      if (!updatedBooked[selectedDate]) {
        updatedBooked[selectedDate] = [];
      }
      updatedBooked[selectedDate].push(selectedTime);
      setBookedSlots(updatedBooked);

      // Notifica em tempo real o painel administrativo
      try {
        const channel = supabase.channel('brilho-magico-realtime');
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'new-appointment',
              payload: {
                id: `app-${Date.now()}`,
                customer_name: customerName,
                customer_phone: cleanPhone,
                vehicle_plate: cleanPlate,
                service_name: selectedService?.name || 'Lavagem',
                scheduled_at: scheduledAt,
                total_price: selectedService?.price || 0,
                payment_method: paymentInfo,
                created_at: new Date().toISOString()
              }
            });
          }
        });
      } catch (rtErr) {
        console.warn("Aviso ao transmitir agendamento em tempo real:", rtErr);
      }

      setLoading(false);
      setStep(3);
    } catch {
      alert("Erro de conexão ao realizar agendamento.");
      setLoading(false);
    }
  };

  // 3. Monta o link para chamar o WhatsApp pré-formatado
  const getWhatsAppMessage = (num: string) => {
    const formattedDate = selectedDate.split('-').reverse().join('/');
    const text = `Olá! Gostaria de confirmar meu agendamento na Brilho Mágico.
    
*Detalhes do Agendamento:*
- *Cliente:* ${customerName}
- *Veículo:* ${vehicleType === 'CARRO' ? '🚗 Carro' : '🏍️ Moto'} (${vehiclePlate.toUpperCase()})
- *Serviço:* ${selectedService?.name}
- *Data/Hora:* ${formattedDate} às ${selectedTime}
- *Valor:* R$ ${selectedService?.price.toFixed(2)}
- *Forma de Pagamento:* ${getPaymentMethodLabel()}${wantCpf ? `\n- *CPF na Nota:* ${customerCpf}` : ''}`;

    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };

  // 4. Lógica do Calendário Semanal
  const getNext7Days = () => {
    const days = [];
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      days.push({
        dateStr,
        dayNumber: date.getDate(),
        weekday: weekdays[date.getDay()],
        isSunday: date.getDay() === 0
      });
    }
    return days;
  };

  const isDayFullyBooked = (dateStr: string) => {
    const booked = bookedSlots[dateStr] || [];
    return booked.length >= TIME_SLOTS_MOCK.length;
  };

  const filteredServices = services.filter(s => s.vehicleType === vehicleType);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-neutral-900 rounded-3xl border border-neutral-800 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        
        {/* Passo 1: Seleção de Veículo e Serviço */}
        {step === 1 && (
          <div>
            {/* Barra Superior com Consultar Pontos e Compartilhar */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  setQueryResult(null);
                  setQuerySearched(false);
                  setIsCheckPointsOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 transition-colors"
                title="Consultar meus pontos de fidelidade"
              >
                <Award size={13} />
                <span>Meus Pontos</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                title="Compartilhar aplicativo com amigos"
              >
                <Share2 size={12} className="text-green-500" />
                <span>Indicar Amigos</span>
              </button>
            </div>

            {/* Header com Identidade Visual Brilho Mágico */}
            <header className="text-center mb-8 flex flex-col items-center">
              <img 
                src={tenantInfo?.logo_url || '/logo.jpg'} 
                alt="Logo" 
                className="w-24 h-24 rounded-2xl object-cover mb-4 border border-neutral-800 bg-neutral-950"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.jpg';
                }}
              />
              <h1 className="text-2xl font-bold text-white tracking-wide">
                {tenantInfo?.name || 'Brilho Mágico'}
              </h1>
              <p className="text-green-500 text-xs font-semibold tracking-widest uppercase mt-1">
                Studio Automotivo
              </p>
              <p className="text-neutral-400 text-sm mt-2">
                Agende sua lavagem e acumule pontos de fidelidade
              </p>
            </header>

            {/* 1. Escolha do Veículo */}
            <section className="mb-8">
              <h2 className="text-xs font-bold text-neutral-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-[10px]">1</span>
                Qual o seu veículo?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleVehicleSelect('CARRO')}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-200 ${
                    vehicleType === 'CARRO'
                      ? 'border-green-500 bg-green-500/5 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <Car size={36} className="mb-2" />
                  <span className="font-semibold text-sm">Carro</span>
                </button>
                <button
                  onClick={() => handleVehicleSelect('MOTO')}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-200 ${
                    vehicleType === 'MOTO'
                      ? 'border-green-500 bg-green-500/5 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <Bike size={36} className="mb-2" />
                  <span className="font-semibold text-sm">Moto</span>
                </button>
              </div>
            </section>

            {/* 2. Escolha do Serviço */}
            {vehicleType && (
              <section className="mb-8">
                <h2 className="text-xs font-bold text-neutral-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-[10px]">2</span>
                  Escolha o serviço para {vehicleType.toLowerCase()}
                </h2>
                {loadingData ? (
                  <div className="text-center py-4 text-xs text-neutral-500">Carregando serviços...</div>
                ) : (
                  <div className="space-y-3">
                    {filteredServices.map((service) => {
                      const lower = service.name.toLowerCase();
                      const isComplexa = lower.includes('complexa');
                      const isTop = lower.includes('top');
                      const isInterna = lower.includes('interna') || lower.includes('limpeza');

                      return (
                        <div
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`p-4 sm:p-5 border rounded-2xl cursor-pointer transition-all duration-200 text-left relative overflow-hidden ${
                            selectedService?.id === service.id
                              ? 'border-green-500 bg-green-950/20 text-white shadow-[0_0_20px_rgba(34,197,94,0.1)] ring-1 ring-green-500/60'
                              : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm text-white">{service.name}</h3>
                                {isComplexa && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                    ✨ Completa Premium
                                  </span>
                                )}
                                {isTop && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    ⭐ Mais Popular
                                  </span>
                                )}
                                {isInterna && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                    🚗 Essencial
                                  </span>
                                )}
                              </div>

                              {/* Lista de Itens Inclusos */}
                              {isInterna && (
                                <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Aspiração interna e porta-malas
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Lavagem pintura e caixa de rodas
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Limpeza básica de vidros
                                  </li>
                                </ul>
                              )}

                              {isTop && (
                                <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Lavagem básica
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Revitalização de plástico interna/externa
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Aplicação de verniz nas caixas de roda
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Aplicação de cera pintura
                                  </li>
                                </ul>
                              )}

                              {isComplexa && (
                                <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Todos os itens da <strong>Lavada Top</strong>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Lavagem por baixo
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Lavagem de motor
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Escovar bancos sem remoção
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span> Escovar carpete sem remoção
                                  </li>
                                </ul>
                              )}

                              <div className="mt-2.5 flex items-center gap-3 text-[11px] text-neutral-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  ~{service.duration} min
                                </span>
                                {(isInterna || isTop || isComplexa) && (
                                  <span className="text-amber-400/90 font-medium">
                                    * Obs: depende do estado do veículo
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-neutral-400 block font-semibold">A partir de</span>
                              <span className="font-black text-base text-green-400">
                                R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {selectedService?.id === service.id && (
                                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                  <Check size={12} /> Selecionado
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Botão de Próximo Passo */}
            {selectedService && (
              <button 
                onClick={handleNextStep}
                className="w-full bg-green-600 hover:bg-green-500 text-neutral-950 font-bold py-4 rounded-2xl shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-200 flex justify-center items-center gap-2"
              >
                <Calendar size={20} />
                Ver Horários Disponíveis
              </button>
            )}

            {/* Botão de Avaliar Atendimento na Parte Inferior do Card */}
            <div className="mt-8 pt-5 border-t border-neutral-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsFeedbackOpen(true);
                  setFeedbackSubmitted(false);
                  setStarWarning(false);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-sm"
              >
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span>⭐ Avaliar Atendimento & Deixar Feedback</span>
              </button>
            </div>
          </div>
        )}

        {/* Passo 2: Formulário com Calendário Semanal Dinâmico */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={handleBackStep}
                  className="p-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-white">Quase lá!</h1>
                  <p className="text-xs text-neutral-400">Selecione o horário e seus dados</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNativeShare}
                className="p-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-neutral-400 hover:text-white transition-colors"
                title="Compartilhar aplicativo"
              >
                <Share2 size={16} className="text-green-500" />
              </button>
            </header>

            {/* Serviço Selecionado Info */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-2xl p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Serviço Selecionado</p>
                <p className="font-bold text-sm text-white mt-0.5">{selectedService?.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{selectedService?.duration} minutos de duração</p>
              </div>
              <span className="font-bold text-base text-green-500">
                R$ {selectedService?.price.toFixed(2)}
              </span>
            </div>

            {/* Calendário Semanal Dinâmico */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selecione o Dia</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {getNext7Days().map((day) => {
                    const fullyBooked = isDayFullyBooked(day.dateStr);
                    const isSelected = selectedDate === day.dateStr;
                    const isSunday = day.isSunday;

                    let btnClasses = "border-neutral-855 bg-neutral-950 text-neutral-400 hover:border-neutral-700";
                    if (isSelected) {
                      btnClasses = "border-green-500 bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.15)]";
                    } else if (isSunday) {
                      btnClasses = "border-neutral-900/60 bg-neutral-950/40 text-neutral-700 cursor-not-allowed";
                    } else if (fullyBooked) {
                      btnClasses = "border-red-500/20 bg-red-500/5 text-red-500 cursor-not-allowed";
                    }

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        disabled={isSunday || fullyBooked}
                        onClick={() => {
                          setSelectedDate(day.dateStr);
                          setSelectedTime('');
                        }}
                        className={`flex flex-col items-center justify-center min-w-[62px] py-2 px-1 rounded-xl border transition-all duration-200 ${btnClasses}`}
                      >
                        <span className="text-[9px] uppercase font-bold tracking-wider">{day.weekday}</span>
                        <span className="text-sm font-bold mt-0.5">{day.dayNumber}</span>
                        {isSunday ? (
                          <span className="text-[8px] text-neutral-600 mt-1">Fechado</span>
                        ) : fullyBooked ? (
                          <span className="text-[8px] text-red-500 mt-1">Lotado</span>
                        ) : (
                          <span className="text-[8px] text-green-500 mt-1">Vagas</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid de Horários */}
              {selectedDate && (
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selecione o Horário</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS_MOCK.map((time) => {
                      const isBooked = (bookedSlots[selectedDate] || []).includes(time);
                      const isSelected = selectedTime === time;

                      let timeClasses = "border-neutral-855 bg-neutral-950 text-neutral-400 hover:border-neutral-700";
                      if (isSelected) {
                        timeClasses = "border-green-500 bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.15)]";
                      } else if (isBooked) {
                        timeClasses = "border-red-500/15 bg-neutral-950 text-red-500/50 cursor-not-allowed line-through";
                      }

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-2 border rounded-xl text-center text-xs font-bold transition-all duration-200 ${timeClasses}`}
                        >
                          {time}
                          {isBooked && <span className="block text-[7px] text-red-500/60 mt-0.5">Ocupado</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cadastro Obrigatório do Cliente */}
            <div className="space-y-4 mb-8">
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Cadastro do Cliente (Obrigatório)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Informe seus dados para confirmar a reserva. Se já for cadastrado, preencha o WhatsApp para auto-completar seus dados e pontos.
                </p>
              </div>
              
              {/* WhatsApp / Celular */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">WhatsApp / Celular *</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-neutral-500" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 38999999999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Nome Completo *</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Seu Nome Completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              {/* Placa do Veículo */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Placa do Veículo *</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ABC1D23"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm font-mono uppercase"
                  />
                </div>
              </div>

              {/* CPF na Nota */}
              <div className="flex flex-col gap-2.5 mt-2">
                <label className="flex items-center gap-2 text-neutral-400 text-xs cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={wantCpf}
                    onChange={(e) => setWantCpf(e.target.checked)}
                    className="rounded border-neutral-850 bg-neutral-950 text-green-500 focus:ring-green-500"
                  />
                  <span>Quero CPF na nota fiscal</span>
                </label>

                {wantCpf && (
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      required={wantCpf}
                      placeholder="CPF do Cliente (apenas números)"
                      value={customerCpf}
                      onChange={(e) => setCustomerCpf(e.target.value.replace(/\D/g, ''))}
                      maxLength={11}
                      className="block w-full pl-10 pr-3 py-3 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* 4. Método de Pagamento Obrigatório */}
              <div className="pt-4 border-t border-neutral-800/80">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-400" />
                    <span>Forma de Pagamento *</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Obrigatório
                  </span>
                </div>

                {/* 3 Opções em Ordem Exata: 1º PIX, 2º Dinheiro, 3º Cartão */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {/* 1º PIX */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'PIX'
                        ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500 scale-[1.02]'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl ${paymentMethod === 'PIX' ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-900 text-emerald-400'}`}>
                      <QrCode size={18} />
                    </div>
                    <span className="text-xs font-black">PIX</span>
                    <span className="text-[9px] text-emerald-400 font-semibold">QR Code / Copia</span>
                  </button>

                  {/* 2º Dinheiro */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('DINHEIRO')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'DINHEIRO'
                        ? 'bg-amber-950/70 border-amber-500 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-500 scale-[1.02]'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl ${paymentMethod === 'DINHEIRO' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-amber-400'}`}>
                      <Banknote size={18} />
                    </div>
                    <span className="text-xs font-black">Dinheiro</span>
                    <span className="text-[9px] text-amber-400 font-semibold">No balcão</span>
                  </button>

                  {/* 3º Cartão */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARTAO')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'CARTAO'
                        ? 'bg-blue-950/70 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500 scale-[1.02]'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl ${paymentMethod === 'CARTAO' ? 'bg-blue-500 text-neutral-950' : 'bg-neutral-900 text-blue-400'}`}>
                      <CreditCard size={18} />
                    </div>
                    <span className="text-xs font-black">Cartão</span>
                    <span className="text-[9px] text-blue-400 font-semibold">Crédito / Débito</span>
                  </button>
                </div>

                {/* DETALHES DE ACORDO COM A FORMA SELECIONADA */}
                {/* Se PIX selecionado */}
                {paymentMethod === 'PIX' && (
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Titular do Pix:</span>
                        <p className="text-xs font-bold text-white">Cláudio Pereira Junior</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Valor do Serviço:</span>
                        <p className="text-sm font-black text-emerald-400">R$ {selectedService?.price.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* QR Code Pix */}
                    <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl shadow-inner my-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getPixCode())}&margin=8`}
                        alt="QR Code Pix"
                        className="w-40 h-40 rounded-xl"
                      />
                      <p className="text-[10px] text-neutral-900 font-bold mt-1.5 flex items-center gap-1">
                        📱 Abra o aplicativo do seu banco e aponte a câmera
                      </p>
                    </div>

                    {/* Botões Copiar Pix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Copiar Chave */}
                      <button
                        type="button"
                        onClick={() => handleCopyPixKey('10751043605')}
                        className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {pixKeyCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-neutral-400" />}
                        <span>{pixKeyCopied ? 'Chave Copiada!' : 'Copiar Chave CPF'}</span>
                      </button>

                      {/* Copiar Pix Copia e Cola */}
                      <button
                        type="button"
                        onClick={() => handleCopyPixPayload(getPixCode())}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20"
                      >
                        {pixCopied ? <Check size={14} /> : <QrCode size={14} />}
                        <span>{pixCopied ? 'Código Copiado!' : 'Pix Copia e Cola'}</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
                      Chave CPF: <strong className="text-neutral-300">10751043605</strong> • Pague agora ou na entrega do veículo.
                    </p>
                  </div>
                )}

                {/* Se DINHEIRO selecionado */}
                {paymentMethod === 'DINHEIRO' && (
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/40 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <Banknote size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Pagamento em Espécie no Balcão</p>
                        <p className="text-[11px] text-neutral-400">Pague presencialmente ao entregar o veículo</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-850">
                      <label className="text-[11px] font-semibold text-neutral-300 block mb-1.5">
                        Vai precisar de troco?
                      </label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setNeedChange(false)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                            !needChange 
                              ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold' 
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          Não preciso de troco
                        </button>
                        <button
                          type="button"
                          onClick={() => setNeedChange(true)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                            needChange 
                              ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold' 
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          Sim, preciso de troco
                        </button>
                      </div>

                      {needChange && (
                        <div className="mt-2 animate-in fade-in duration-150">
                          <input
                            type="text"
                            placeholder="Troco para quanto? (Ex: R$ 100,00)"
                            value={changeFor}
                            onChange={(e) => setChangeFor(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Se CARTÃO selecionado (Sub-opções Crédito ou Débito) */}
                {paymentMethod === 'CARTAO' && (
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-blue-500/40 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Pagamento na Maquininha</p>
                        <p className="text-[11px] text-neutral-400">Selecione se prefere pagar no Crédito ou Débito:</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCardType('CREDITO')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          cardType === 'CREDITO'
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span>💳 Cartão de Crédito</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCardType('DEBITO')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          cardType === 'DEBITO'
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span>💳 Cartão de Débito</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-neutral-500 text-center">
                      Aceitamos as principais bandeiras (Visa, Mastercard, Elo, Hipercard).
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedTime || !selectedDate || !paymentMethod}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-2xl transition-colors duration-200 flex justify-center items-center gap-2 shadow-lg shadow-green-500/10"
            >
              {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
            </button>
          </form>
        )}

        {/* Passo 3: Tela Final de Sucesso com Cartão Fidelidade, Compartilhamento & Mapa */}
        {step === 3 && (
          <div className="text-center py-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
              <Check size={36} />
            </div>

            <h1 className="text-2xl font-bold text-white">Agendamento Realizado!</h1>
            <p className="text-green-500 text-xs font-semibold tracking-wider uppercase mt-1">Brilho Mágico agradece</p>
            
            <p className="text-neutral-400 text-sm mt-4 px-2 leading-relaxed">
              Tudo pronto! Seu agendamento foi registrado com sucesso na nossa fila.
            </p>

            {/* CARD DE FORMA DE PAGAMENTO SELECIONADA */}
            <div className="mt-6 p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left w-full shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    paymentMethod === 'PIX' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : paymentMethod === 'DINHEIRO' 
                      ? 'bg-amber-500/10 text-amber-400' 
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {paymentMethod === 'PIX' && <QrCode size={18} />}
                    {paymentMethod === 'DINHEIRO' && <Banknote size={18} />}
                    {paymentMethod === 'CARTAO' && <CreditCard size={18} />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Forma de Pagamento
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {paymentMethod === 'PIX' && 'Pagamento via PIX Instantâneo'}
                      {paymentMethod === 'DINHEIRO' && `Dinheiro no Balcão${needChange && changeFor ? ` (Troco para ${changeFor})` : ''}`}
                      {paymentMethod === 'CARTAO' && `Cartão de ${cardType === 'CREDITO' ? 'Crédito' : 'Débito'} na Maquininha`}
                    </p>
                  </div>
                </div>

                <span className="text-sm font-black text-emerald-400">
                  R$ {selectedService?.price.toFixed(2)}
                </span>
              </div>

              {/* Se PIX, exibe QR Code e botões de cópia na tela final */}
              {paymentMethod === 'PIX' && (
                <div className="mt-3.5 space-y-3">
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getPixCode())}&margin=6`}
                      alt="QR Code Pix"
                      className="w-36 h-36 rounded-lg"
                    />
                    <p className="text-[10px] text-neutral-800 font-bold mt-1">
                      📱 Escaneie com o app do seu banco
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyPixKey('10751043605')}
                      className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {pixKeyCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-neutral-400" />}
                      <span>{pixKeyCopied ? 'Chave Copiada!' : 'Copiar Chave CPF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyPixPayload(getPixCode())}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20"
                    >
                      {pixCopied ? <Check size={14} /> : <QrCode size={14} />}
                      <span>{pixCopied ? 'Código Copiado!' : 'Pix Copia e Cola'}</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-neutral-400 text-center">
                    Favorecido: <strong className="text-white">Cláudio Pereira Junior</strong> • Chave: <strong className="text-white">10751043605</strong>
                  </p>
                </div>
              )}
            </div>

            {/* CARTÃO DE FIDELIDADE DIGITAL */}
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-950 border border-amber-500/30 text-left w-full shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Cartão Fidelidade Brilho Mágico
                    </h3>
                    <p className="text-[10px] text-neutral-400">Cliente: {customerName || 'Cliente'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRulesOpen(true)}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-[10px] flex items-center gap-1 font-semibold transition-colors"
                  title="Ver regras do programa"
                >
                  <Info size={12} className="text-amber-400" />
                  Regras
                </button>
              </div>

              {/* Saldo de Pontos */}
              <div className="flex items-baseline justify-between mb-4 bg-neutral-950/60 p-3 rounded-xl border border-neutral-850">
                <span className="text-xs text-neutral-400 font-medium">Seu saldo acumulado:</span>
                <span className="text-lg font-black text-amber-400 flex items-center gap-1">
                  ⭐ {customerPoints} {customerPoints === 1 ? 'ponto' : 'pontos'}
                </span>
              </div>

              {/* Barra de Progresso - Meta 1: Ducha Simples (10 pts) */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-neutral-300 flex items-center gap-1">
                    🚿 1 Ducha Simples Grátis
                  </span>
                  <span className="font-bold text-amber-400">
                    {Math.min(customerPoints, 10)} / 10 pts
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, (customerPoints / 10) * 100)}%` }}
                  />
                </div>
                {customerPoints >= 10 && (
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                    🎉 Parabéns! Você já tem pontos suficientes para resgatar uma Ducha Grátis!
                  </p>
                )}
              </div>

              {/* Barra de Progresso - Meta 2: Lavagem Completa (20 pts) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-neutral-300 flex items-center gap-1">
                    ✨ 1 Lavagem Completa Grátis
                  </span>
                  <span className="font-bold text-amber-400">
                    {Math.min(customerPoints, 20)} / 20 pts
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, (customerPoints / 20) * 100)}%` }}
                  />
                </div>
                {customerPoints >= 20 && (
                  <p className="text-[10px] text-yellow-400 font-bold mt-0.5">
                    👑 Incrível! Você atingiu 20 pontos e pode resgatar uma Lavagem Completa grátis!
                  </p>
                )}
              </div>

              <p className="text-[10px] text-neutral-500 mt-3.5 border-t border-neutral-800/80 pt-2.5 text-center">
                💡 A cada lavagem concluída você ganha 1 ponto automático. Seus pontos não expiram!
              </p>
            </div>

            {/* Banner de Compartilhar com Amigos */}
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-green-950/40 via-neutral-900 to-neutral-950 border border-green-500/30 text-left w-full shadow-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">✨</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Gostou da facilidade? Indique para Amigos!
                </h3>
              </div>
              <p className="text-[11px] text-neutral-400 mb-4 leading-relaxed">
                Compartilhe o aplicativo da {tenantInfo?.name || 'Brilho Mágico'} para que seus amigos e familiares também agendem sem filas.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Compartilhar no WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(getShareText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-green-600 hover:bg-green-500 text-neutral-950 font-bold text-xs transition-colors shadow-md shadow-green-500/10"
                >
                  <MessageSquare size={15} />
                  Enviar no WhatsApp
                </a>

                {/* Copiar Link / Outros Apps */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-white font-semibold text-xs transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={15} className="text-green-500" />
                      <span>Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={15} className="text-neutral-300" />
                      <span>Compartilhar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Links de WhatsApp dos administradores */}
            <div className="mt-8 border-t border-neutral-800 pt-6 w-full text-left">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                💬 Confirmar Agendamento / Contato
              </h3>
              <p className="text-[11px] text-neutral-400 mb-4 leading-relaxed">
                Clique em um dos números abaixo para iniciar a conversa no WhatsApp:
              </p>
              <div className="space-y-3">
                <a
                  href={getWhatsAppMessage('5538999200580')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-2xl text-left transition-all duration-200"
                >
                  <div>
                    <p className="text-xs text-neutral-500">Atendimento Principal</p>
                    <p className="font-bold text-sm text-white mt-0.5">Falar com Claudio</p>
                    <p className="text-[10px] text-green-500 font-semibold uppercase mt-1">Admin</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-600/10 text-green-500 flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                </a>

                <a
                  href={getWhatsAppMessage('5538998853463')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-2xl text-left transition-all duration-200"
                >
                  <div>
                    <p className="text-xs text-neutral-500">Gerência de Operações</p>
                    <p className="font-bold text-sm text-white mt-0.5">Falar com Monaliza</p>
                    <p className="text-[10px] text-green-500 font-semibold uppercase mt-1">Gerente Geral</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-600/10 text-green-500 flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                </a>
              </div>
            </div>

            {/* Como chegar / Localização Google Maps */}
            <div className="mt-8 border-t border-neutral-800 pt-6 w-full text-left">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                📍 Como chegar até nós
              </h3>
              <p className="text-[11px] text-neutral-400 mb-4 leading-relaxed">
                Avenida Florips Crispim, N 644 - Bairro Novo Panorama, Salinas - MG
              </p>
              
              {/* Iframe embutido estilizado em Modo Escuro */}
              <div className="w-full h-40 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 mb-3 shadow-inner">
                <iframe
                  title="Brilho Mágico Localização"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
                  src="https://maps.google.com/maps?q=Avenida%20Florips%20Crispim,%20644%20Novo%20Panorama,%20Salinas%20MG&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Botão de rota direta por aplicativo */}
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Avenida+Florips+Crispim,+644+-+Novo+Panorama,+Salinas+-+MG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center py-3 bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-[11px] font-semibold text-white tracking-wide transition-colors duration-200 gap-1.5"
              >
                🗺️ Abrir Rota no Google Maps (GPS)
              </a>
            </div>

            {/* Avaliação & Feedback no Passo 3 */}
            <div className="mt-8 border-t border-neutral-800 pt-6 w-full text-left">
              <button
                type="button"
                onClick={() => {
                  setIsFeedbackOpen(true);
                  setFeedbackName(customerName);
                  setFeedbackPhone(customerPhone);
                  setFeedbackSubmitted(false);
                  setStarWarning(false);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-yellow-500/15 hover:from-amber-500/25 hover:to-yellow-500/25 border border-amber-500/40 text-xs font-bold text-amber-400 flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span>⭐ Avaliar nosso atendimento e deixar feedback</span>
              </button>
            </div>

            <button 
              onClick={() => {
                setStep(1);
                setVehicleType(null);
                setSelectedService(null);
                setSelectedDate('');
                setSelectedTime('');
                setCustomerName('');
                setCustomerPhone('');
                setVehiclePlate('');
              }}
              className="mt-8 text-xs text-neutral-500 hover:text-neutral-300 font-medium transition-colors"
            >
              Fazer novo agendamento
            </button>
          </div>
        )}

      </div>

      {/* Modal de Feedback & Avaliação com 5 Estrelas (Mínimo 50 Caracteres) */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Star size={20} className="fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Avaliar Atendimento</h3>
                  <p className="text-[11px] text-neutral-400">Conte sua experiência na Brilho Mágico</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFeedbackOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl animate-bounce">
                  ⭐
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Muito Obrigado pelo seu Feedback! 🎉</h4>
                  <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                    Sua avaliação de <strong>{feedbackRating} estrelas</strong> foi registrada com sucesso e nos ajuda a melhorar cada dia mais o atendimento na <strong>Brilho Mágico</strong>!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(false)}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-neutral-950 font-bold rounded-xl text-xs transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                {/* Nome e Telefone (opcionais) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                      Seu Nome (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Ferreira"
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                      WhatsApp (Opcional)
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: 38999999999"
                      value={feedbackPhone}
                      onChange={(e) => setFeedbackPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Comentário Obrigatório (mínimo 50 caracteres) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      O que achou do serviço e atendimento? *
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      feedbackComment.trim().length >= 50
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                    }`}>
                      {feedbackComment.trim().length} / 50 mín.
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    required
                    placeholder="Escreva em detalhes o que achou do atendimento, rapidez, qualidade da lavagem e estrutura da Brilho Mágico (mínimo 50 caracteres)..."
                    value={feedbackComment}
                    onChange={(e) => {
                      setFeedbackComment(e.target.value);
                      if (e.target.value.trim().length >= 50) {
                        setStarWarning(false);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                  ></textarea>

                  {/* Alerta de progresso de caracteres */}
                  {feedbackComment.trim().length < 50 ? (
                    <p className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
                      <span>✍️ Faltam <strong>{50 - feedbackComment.trim().length}</strong> caracteres para liberar a avaliação com as 5 estrelas.</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <span>✅ Mínimo de 50 caracteres atingido! Agora clique nas estrelas abaixo:</span>
                    </p>
                  )}
                </div>

                {/* Alerta caso tente clicar nas estrelas antes de 50 chars */}
                {starWarning && feedbackComment.trim().length < 50 && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 animate-bounce">
                    ⚠️ <strong>Atenção:</strong> Por regra, você precisa escrever no mínimo 50 caracteres no campo acima antes de poder marcar as estrelas!
                  </div>
                )}

                {/* Seção das 5 Estrelas */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[11px] font-bold text-neutral-300 block mb-2.5">
                    Quantas estrelas você dá para a Brilho Mágico?
                  </span>

                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isUnlocked = feedbackComment.trim().length >= 50;
                      const isFilled = (feedbackHoverRating || feedbackRating) >= star;

                      return (
                        <button
                          key={star}
                          type="button"
                          disabled={!isUnlocked}
                          onMouseEnter={() => isUnlocked && setFeedbackHoverRating(star)}
                          onMouseLeave={() => isUnlocked && setFeedbackHoverRating(0)}
                          onClick={() => handleStarClick(star)}
                          className={`p-1.5 rounded-xl transition-all ${
                            isUnlocked
                              ? 'cursor-pointer hover:scale-125 active:scale-95'
                              : 'cursor-not-allowed opacity-40'
                          }`}
                          title={isUnlocked ? `${star} estrelas` : 'Escreva 50 caracteres para desbloquear'}
                        >
                          <Star 
                            size={28} 
                            className={`transition-colors ${
                              isFilled && isUnlocked
                                ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : isFilled
                                ? 'fill-neutral-600 text-neutral-600'
                                : 'text-neutral-700'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Legenda da nota selecionada */}
                  {feedbackComment.trim().length >= 50 ? (
                    <div className="mt-2.5 text-xs font-bold text-amber-400">
                      {feedbackRating === 1 && "😞 1 Estrela - Precisa melhorar"}
                      {feedbackRating === 2 && "😐 2 Estrelas - Regular"}
                      {feedbackRating === 3 && "🙂 3 Estrelas - Bom"}
                      {feedbackRating === 4 && "😀 4 Estrelas - Muito Bom"}
                      {feedbackRating === 5 && "🌟 5 Estrelas - Excelente / Impecável!"}
                      {feedbackRating === 0 && "Clique nas estrelas para selecionar sua nota"}
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] text-neutral-500 flex items-center justify-center gap-1">
                      <Lock size={11} />
                      <span>Estrelas bloqueadas até atingir 50 caracteres</span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={feedbackLoading || feedbackComment.trim().length < 50 || feedbackRating === 0}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    {feedbackLoading ? 'Enviando...' : 'Enviar Avaliação'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Consulta de Pontos do Cliente */}
      {isCheckPointsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Award size={18} />
                </div>
                <h3 className="font-bold text-white text-sm">Consultar Pontos</h3>
              </div>
              <button 
                onClick={() => setIsCheckPointsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSearchPoints} className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  Digite seu WhatsApp / Celular:
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-neutral-500" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 38999999999"
                    value={queryPhone}
                    onChange={(e) => setQueryPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={queryLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                <Search size={14} />
                {queryLoading ? 'Buscando...' : 'Consultar Saldo'}
              </button>
            </form>

            {querySearched && !queryLoading && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                {queryResult ? (
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/30">
                    <p className="text-xs font-semibold text-neutral-300">Olá, {queryResult.name}!</p>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-[11px] text-neutral-400">Saldo Atual:</span>
                      <span className="text-base font-black text-amber-400">
                        ⭐ {queryResult.points} {queryResult.points === 1 ? 'ponto' : 'pontos'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-[10px] text-neutral-400">
                      <p>🚿 Ducha Grátis: {Math.min(queryResult.points, 10)} / 10 pts</p>
                      <p>✨ Lavagem Completa: {Math.min(queryResult.points, 20)} / 20 pts</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 text-center py-2">
                    Nenhum cadastro encontrado para esse número. Realize seu primeiro agendamento para começar a acumular!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Regras de Fidelidade */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-bold text-white text-sm">Regras do Cartão Fidelidade</h3>
              </div>
              <button 
                onClick={() => setIsRulesOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <p className="font-bold text-white mb-1">⭐ Como acumular:</p>
                <p>A cada lavagem concluída na Brilho Mágico, você ganha <strong>1 ponto</strong> automaticamente no seu número de WhatsApp.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-white">🎁 Seus Prêmios:</p>
                <div className="flex justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span>🚿 <strong>1 Ducha Simples de Brinde</strong></span>
                  <span className="font-bold text-emerald-400">10 Pontos</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span>✨ <strong>1 Lavagem Completa de Brinde</strong></span>
                  <span className="font-bold text-amber-400">20 Pontos</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <p className="font-bold text-white mb-0.5">⏳ Sem Expiração:</p>
                <p>Seus pontos nunca expiram! Você pode resgatar quando quiser no balcão.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRulesOpen(false)}
              className="mt-5 w-full py-2.5 bg-green-600 hover:bg-green-500 text-neutral-950 font-bold rounded-xl text-xs transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Botões de Ação no Rodapé */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            setIsFeedbackOpen(true);
            setFeedbackSubmitted(false);
            setStarWarning(false);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors py-2 px-4 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 shadow-xs"
        >
          <Star size={13} className="fill-amber-400 text-amber-400" />
          <span>⭐ Avaliar Atendimento</span>
        </button>

        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-green-400 transition-colors py-2 px-4 rounded-full hover:bg-neutral-900 border border-neutral-800"
        >
          <Share2 size={13} />
          <span>{copied ? 'Link Copiado!' : 'Compartilhar com amigos'}</span>
        </button>
      </div>

      {/* Footer com Endereço do Lava Rápido */}
      <footer className="mt-4 text-center text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
        <p className="font-semibold text-neutral-400">📍 Endereço:</p>
        <p>{tenantInfo?.address || 'Avenida Florips Crispim, N 644 - Bairro Novo Panorama, Salinas - MG'}</p>
      </footer>

      {/* Footer Criado por Kryon Systems */}
      <footer className="mt-6 mb-4 text-center text-[10px] text-neutral-600 flex flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-1.5">
          <span>Criado por</span>
          <a
            href="https://www.kryonsystems.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-neutral-400 hover:text-green-500 tracking-wider transition-colors hover:underline"
          >
            KRYON SYSTEMS
          </a>
        </div>
        <span className="text-[9px] text-neutral-700 font-medium">v1.0.0</span>
      </footer>
    </div>
  );
}

