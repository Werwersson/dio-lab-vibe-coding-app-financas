/**
 * FINVIBE.AI - Motor de Aplicação & Agente de Finanças em Linguagem Natural
 * Conceito de Vibe Coding aplicado a Finanças Pessoais
 */

// ==========================================
// 1. ESTADO GLOBAL & DADOS INICIAIS
// ==========================================
const STORAGE_KEYS = {
    TRANSACTIONS: 'finvibe_transactions_v1',
    GOALS: 'finvibe_goals_v1',
    CHAT_HISTORY: 'finvibe_chat_history_v1'
};

const INITIAL_TRANSACTIONS = [
    { id: 'tx-1', desc: 'Salário Mensal', amount: 4800.00, type: 'income', category: 'Salário', date: '2026-10-01', origin: 'Agente IA' },
    { id: 'tx-2', desc: 'Aluguel do Apartamento', amount: 1350.00, type: 'expense', category: 'Moradia', date: '2026-10-02', origin: 'Manual' },
    { id: 'tx-3', desc: 'Supermercado Mensal', amount: 480.50, type: 'expense', category: 'Alimentação', date: '2026-10-03', origin: 'Agente IA' },
    { id: 'tx-4', desc: 'Freelance Design / Web', amount: 950.00, type: 'income', category: 'Salário', date: '2026-10-04', origin: 'Agente IA' },
    { id: 'tx-5', desc: 'Combustível & Uber', amount: 160.00, type: 'expense', category: 'Transporte', date: '2026-10-05', origin: 'Agente IA' },
    { id: 'tx-6', desc: 'Assinatura Streaming & Games', amount: 65.90, type: 'expense', category: 'Lazer', date: '2026-10-06', origin: 'Manual' },
    { id: 'tx-7', desc: 'Farmácia e Vitaminas', amount: 94.20, type: 'expense', category: 'Saúde', date: '2026-10-07', origin: 'Agente IA' },
    { id: 'tx-8', desc: 'Jantar Restaurante', amount: 125.00, type: 'expense', category: 'Alimentação', date: '2026-10-07', origin: 'Agente IA' }
];

const INITIAL_GOALS = [
    { id: 'goal-1', title: 'Reserva de Emergência (6 meses)', target: 8000, current: 3500, deadline: '2026-12-31' },
    { id: 'goal-2', title: 'Viagem de Fim de Ano', target: 3000, current: 1800, deadline: '2026-11-20' },
    { id: 'goal-3', title: 'Novo Setup Dev & Monitor Ultrawide', target: 4500, current: 3600, deadline: '2026-10-30' }
];

// App State
let state = {
    transactions: JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || INITIAL_TRANSACTIONS,
    goals: JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || INITIAL_GOALS,
    activeTab: 'dashboard',
    charts: {
        category: null,
        flow: null
    }
};

// ==========================================
// 2. HELPERS & FORMATADORES
// ==========================================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function saveState() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(state.goals));
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `<i data-lucide="${iconName}"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================
// 3. ENGINE DE LINGUAGEM NATURAL (VIBE CODING NLP)
// ==========================================
class VibeAIEngine {
    static parseUserMessage(text) {
        const rawText = text.trim();
        const lower = rawText.toLowerCase();

        // 1. Verificar intenção de Dúvida / Resumo / Saldo
        if (
            lower.includes('saldo') || 
            lower.includes('extrato') || 
            lower.includes('resumo') || 
            lower.includes('quanto tenho') ||
            lower.includes('minha situação')
        ) {
            return { intent: 'CHECK_BALANCE' };
        }

        // 2. Verificar pedido de Dica ou Economia
        if (
            lower.includes('dica') || 
            lower.includes('economizar') || 
            lower.includes('poupar') || 
            lower.includes('conselho') ||
            lower.includes('ajuda')
        ) {
            return { intent: 'GET_TIP' };
        }

        // 3. Verificar intenção de Criar Meta
        if (
            lower.includes('meta') || 
            lower.includes('objetivo') || 
            lower.includes('guardar para') ||
            lower.includes('poupar para')
        ) {
            const val = this.extractAmount(lower);
            const titleMatch = rawText.replace(/criar meta|nova meta|meta de|guardar para|de r\$|\d+|[.,]/gi, '').trim();
            const title = titleMatch.length > 2 ? titleMatch : 'Nova Conquista';
            
            return {
                intent: 'CREATE_GOAL',
                target: val || 2000,
                title: title.charAt(0).toUpperCase() + title.slice(1)
            };
        }

        // 4. Extração de Valor Numérico
        const amount = this.extractAmount(lower);
        if (!amount) {
            return { 
                intent: 'CHAT_GENERAL', 
                message: "Não consegui identificar um valor monetário. Você pode dizer algo como: *'Gastei 45 no mercado'* ou *'Recebi 1200 de freela'*." 
            };
        }

        // 5. Determinar se é Receita ou Despesa
        const isIncome = /(recebi|ganhei|salario|salário|freela|freelance|rendimento|vendi|pix recebido|deposito|depósito|entrou)/i.test(lower);
        const type = isIncome ? 'income' : 'expense';

        // 6. Categorizar e Limpar Descrição
        const category = this.detectCategory(lower, type);
        const desc = this.cleanDescription(rawText, amount, type);

        return {
            intent: 'ADD_TRANSACTION',
            transaction: {
                id: 'tx-' + Date.now(),
                desc: desc || (type === 'income' ? 'Entrada Diversa' : 'Gasto Avulso'),
                amount: amount,
                type: type,
                category: category,
                date: new Date().toISOString().split('T')[0],
                origin: 'Agente IA'
            }
        };
    }

    static extractAmount(text) {
        // Trata "R$ 45,50", "45.50", "45 reais", "1.200,00", "2500"
        const regex = /(?:r\$\s*)?(\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)\s*(?:reais|real)?/i;
        const match = text.match(regex);
        if (!match) return null;

        let numStr = match[1];
        if (numStr.includes('.') && numStr.includes(',')) {
            // Formato brasileiro: 1.250,50 -> 1250.50
            numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else if (numStr.includes(',')) {
            numStr = numStr.replace(',', '.');
        }

        const val = parseFloat(numStr);
        return isNaN(val) ? null : val;
    }

    static detectCategory(text, type) {
        if (type === 'income') {
            if (/(salario|salário|mensal|pagamento)/i.test(text)) return 'Salário';
            if (/(freela|freelance|bico|projeto|extra)/i.test(text)) return 'Salário';
            if (/(investimento|dividendo|rendeu|cdi)/i.test(text)) return 'Investimentos';
            return 'Salário';
        }

        if (/(almoço|almoco|jantar|lanche|comida|mercado|supermercado|padaria|pizza|ifood|acai|açaí|restaurante|café|cafe)/i.test(text)) return 'Alimentação';
        if (/(uber|99|gasolina|combustivel|combustível|posto|onibus|ônibus|metro|metrô|estacionamento|passagem)/i.test(text)) return 'Transporte';
        if (/(aluguel|condominio|condomínio|luz|energia|agua|água|internet|iptu|faxina|casa)/i.test(text)) return 'Moradia';
        if (/(cinema|netflix|spotify|bar|chopp|cerveja|festa|show|jogo|steam|viagem|passeio)/i.test(text)) return 'Lazer';
        if (/(farmacia|farmácia|remedio|remédio|medico|médico|consulta|dentista|academia|suplemento|exame)/i.test(text)) return 'Saúde';
        if (/(curso|livro|dio|bootcamp|faculdade|escola|mensalidade|treinamento)/i.test(text)) return 'Educação';
        
        return 'Outros';
    }

    static cleanDescription(rawText, amount, type) {
        let cleaned = rawText
            .replace(/gastei|paguei|comprei|gasto com|recebi|ganhei|entrou|r\$|\d+|reais|real|[.,]/gi, '')
            .replace(/hoje|ontem|no|na|de|com|em|um|uma|o|a/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.length < 2) {
            return type === 'income' ? 'Entrada Identificada' : 'Despesa Registrada';
        }
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
}

// ==========================================
// 4. ATUALIZAÇÃO DA UI & CÁLCULO DE MÉTRICAS
// ==========================================
function calculateMetrics() {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;

    state.transactions.forEach(tx => {
        if (tx.type === 'income') {
            totalIncome += tx.amount;
            incomeCount++;
        } else {
            totalExpense += tx.amount;
        }
    });

    const balance = totalIncome - totalExpense;
    const expenseRate = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(0) : 0;
    const savings = balance > 0 ? balance : 0;

    return { totalIncome, totalExpense, balance, incomeCount, expenseRate, savings };
}

function updateDashboardUI() {
    const metrics = calculateMetrics();

    // Atualizar Cards
    const balanceElem = document.getElementById('cardTotalBalance');
    balanceElem.textContent = formatCurrency(metrics.balance);
    balanceElem.style.color = metrics.balance >= 0 ? '#10B981' : '#F43F5E';

    document.getElementById('cardTotalIncome').textContent = formatCurrency(metrics.totalIncome);
    document.getElementById('cardTotalExpense').textContent = formatCurrency(metrics.totalExpense);
    document.getElementById('cardTotalSavings').textContent = formatCurrency(metrics.savings);

    document.getElementById('incomeCount').textContent = `${metrics.incomeCount} entrada(s) este mês`;
    document.getElementById('expenseRateText').textContent = `${metrics.expenseRate}% da renda comprometida`;
    
    // Alerta de Gastos
    const alertCont = document.getElementById('expenseAlertContainer');
    if (metrics.expenseRate > 80) {
        alertCont.className = 'metric-footer negative';
        alertCont.innerHTML = `<i data-lucide="alert-triangle"></i><span>Alerta: gastos acima de 80% da renda!</span>`;
    } else {
        alertCont.className = 'metric-footer positive';
        alertCont.innerHTML = `<i data-lucide="check-circle"></i><span>Orçamento equilibrado (${metrics.expenseRate}%)</span>`;
    }

    // Renderizar Listas Resumidas
    renderDashboardTransactions();
    renderDashboardGoals();

    // Atualizar Gráficos
    updateCharts();
    
    // Atualizar Ícones Lucide
    lucide.createIcons();
}

function renderDashboardTransactions() {
    const container = document.getElementById('dashboardTransactionsList');
    const recent = [...state.transactions].reverse().slice(0, 4);

    if (recent.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">Nenhuma transação registrada ainda.</p>`;
        return;
    }

    container.innerHTML = recent.map(tx => {
        const isIncome = tx.type === 'income';
        const icon = isIncome ? 'arrow-down-left' : 'arrow-up-right';
        const iconClass = isIncome ? 'income' : 'expense';
        const valClass = isIncome ? 'positive' : 'negative';
        const prefix = isIncome ? '+ ' : '- ';

        return `
            <div class="tx-mini-item">
                <div class="tx-mini-info">
                    <div class="tx-mini-icon ${iconClass}">
                        <i data-lucide="${icon}"></i>
                    </div>
                    <div class="tx-mini-text">
                        <strong>${tx.desc}</strong>
                        <span>${tx.category} • ${formatDateBR(tx.date)}</span>
                    </div>
                </div>
                <span class="tx-mini-val ${valClass}">${prefix}${formatCurrency(tx.amount)}</span>
            </div>
        `;
    }).join('');
}

function renderDashboardGoals() {
    const container = document.getElementById('dashboardGoalsList');
    if (state.goals.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">Nenhuma meta ativa no momento.</p>`;
        return;
    }

    container.innerHTML = state.goals.slice(0, 3).map(goal => {
        const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
        return `
            <div class="goal-mini-item">
                <div class="goal-mini-header">
                    <strong>${goal.title}</strong>
                    <span>${pct}% (${formatCurrency(goal.current)})</span>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 5. GRÁFICOS (CHART.JS)
// ==========================================
function updateCharts() {
    // 1. Gráfico de Categorias de Despesas
    const categoryTotals = {};
    state.transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const catLabels = Object.keys(categoryTotals);
    const catData = Object.values(categoryTotals);

    const categoryColors = [
        '#6366F1', '#EC4899', '#10B981', '#F59E0B', 
        '#06B6D4', '#8B5CF6', '#F43F5E', '#64748B'
    ];

    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    if (state.charts.category) state.charts.category.destroy();

    state.charts.category = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: catLabels.length ? catLabels : ['Sem despesas'],
            datasets: [{
                data: catData.length ? catData : [1],
                backgroundColor: catData.length ? categoryColors.slice(0, catLabels.length) : ['#334155'],
                borderWidth: 2,
                borderColor: '#0F172A',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 }, boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const val = context.raw || 0;
                            return ` ${context.label}: ${formatCurrency(val)}`;
                        }
                    }
                }
            },
            cutout: '68%'
        }
    });

    // 2. Gráfico de Fluxo Financeiro (Entradas vs Saídas)
    const metrics = calculateMetrics();
    const ctxFlow = document.getElementById('flowChart').getContext('2d');
    if (state.charts.flow) state.charts.flow.destroy();

    state.charts.flow = new Chart(ctxFlow, {
        type: 'bar',
        data: {
            labels: ['Total Receitas', 'Total Despesas', 'Economia Gerada'],
            datasets: [{
                data: [metrics.totalIncome, metrics.totalExpense, metrics.savings],
                backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(244, 63, 94, 0.8)', 'rgba(99, 102, 241, 0.8)'],
                borderColor: ['#10B981', '#F43F5E', '#6366F1'],
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    ticks: { color: '#64748B', callback: (v) => 'R$ ' + v },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#94A3B8' },
                    grid: { display: false }
                }
            }
        }
    });
}

// ==========================================
// 6. TABELA COMPLETA DE TRANSAÇÕES
// ==========================================
function renderTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    const emptyState = document.getElementById('txEmptyState');
    const searchVal = document.getElementById('txSearchInput').value.toLowerCase();
    const filterType = document.getElementById('txFilterType').value;
    const filterCat = document.getElementById('txFilterCategory').value;

    const filtered = state.transactions.filter(tx => {
        const matchesSearch = tx.desc.toLowerCase().includes(searchVal) || tx.category.toLowerCase().includes(searchVal);
        const matchesType = filterType === 'all' || tx.type === filterType;
        const matchesCat = filterCat === 'all' || tx.category === filterCat;
        return matchesSearch && matchesType && matchesCat;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = filtered.map(tx => {
        const isIncome = tx.type === 'income';
        const sign = isIncome ? '+' : '-';
        const cellClass = isIncome ? 'income' : 'expense';

        return `
            <tr>
                <td>${formatDateBR(tx.date)}</td>
                <td><strong>${tx.desc}</strong></td>
                <td><span class="category-tag">${tx.category}</span></td>
                <td><span class="origin-tag">${tx.origin || 'Manual'}</span></td>
                <td class="amount-cell ${cellClass}">${sign} ${formatCurrency(tx.amount)}</td>
                <td>
                    <button class="btn-delete-tx" onclick="deleteTransaction('${tx.id}')" title="Excluir">
                        <i data-lucide="trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

window.deleteTransaction = function(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    updateDashboardUI();
    renderTransactionsTable();
    showToast('Transação excluída com sucesso.', 'danger');
};

// ==========================================
// 7. GESTÃO DE METAS & SONHOS
// ==========================================
function renderGoalsCards() {
    const grid = document.getElementById('goalsCardsGrid');
    if (state.goals.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1"><i data-lucide="target"></i><p>Nenhuma meta cadastrada. Crie uma para começar a guardar!</p></div>`;
        lucide.createIcons();
        return;
    }

    grid.innerHTML = state.goals.map(goal => {
        const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const remaining = Math.max(0, goal.target - goal.current);

        return `
            <div class="goal-card">
                <div>
                    <div class="goal-card-top">
                        <div class="goal-card-icon">
                            <i data-lucide="award"></i>
                        </div>
                        <div class="goal-card-actions">
                            <button class="btn-icon" onclick="openDepositModal('${goal.id}')" title="Aportar valor">
                                <i data-lucide="plus"></i>
                            </button>
                            <button class="btn-icon" onclick="deleteGoal('${goal.id}')" title="Excluir meta">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    <h3 class="goal-card-title">${goal.title}</h3>
                    <p class="goal-card-deadline"><i data-lucide="calendar"></i> Prazo estimado: ${formatDateBR(goal.deadline)}</p>
                    
                    <div class="goal-card-values">
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Guardado</span>
                            <span class="goal-val-current">${formatCurrency(goal.current)}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Objetivo</span>
                            <span class="goal-val-target">${formatCurrency(goal.target)}</span>
                        </div>
                    </div>

                    <div class="goal-progress-bar" style="margin-top: 0.75rem;">
                        <div class="goal-progress-fill" style="width: ${pct}%"></div>
                    </div>
                </div>

                <div class="goal-card-footer">
                    <span style="font-size: 0.85rem; font-weight: 600; color: ${pct >= 100 ? '#10B981' : '#818CF8'};">
                        ${pct >= 100 ? '🎉 Meta Concluída!' : `${pct}% Atingido`}
                    </span>
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="openDepositModal('${goal.id}')">
                        <i data-lucide="piggy-bank"></i> Aportar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

window.openDepositModal = function(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    document.getElementById('depositGoalId').value = goal.id;
    document.getElementById('depositGoalTitle').textContent = `Guardando para: "${goal.title}" (Meta: ${formatCurrency(goal.target)})`;
    document.getElementById('inputDepositAmount').value = '';
    document.getElementById('modalDepositGoal').style.display = 'flex';
};

window.deleteGoal = function(id) {
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    renderGoalsCards();
    updateDashboardUI();
    showToast('Meta removida.', 'danger');
};

// ==========================================
// 8. HUB DE INSIGHTS & INTELIGÊNCIA
// ==========================================
function renderInsights() {
    const container = document.getElementById('insightsCardsContainer');
    const metrics = calculateMetrics();

    const insights = [
        {
            type: metrics.expenseRate <= 60 ? 'success' : 'warning',
            icon: metrics.expenseRate <= 60 ? 'shield-check' : 'alert-triangle',
            title: 'Regra 50-30-20 & Orçamento',
            desc: `Atualmente suas despesas representam **${metrics.expenseRate}%** da sua renda. O ideal é manter até 50% em necessidades básicas, 30% em estilo de vida e 20% guardados para o futuro.`,
            action: 'Ver distribuição no Dashboard'
        },
        {
            type: 'default',
            icon: 'sparkles',
            title: 'Potencial de Aceleração de Metas',
            desc: `Com a sua economia mensal projetada de **${formatCurrency(metrics.savings)}**, você consegue atingir sua meta de reserva de emergência em tempo recorde.`,
            action: 'Simular novos aportes'
        },
        {
            type: 'success',
            icon: 'trending-up',
            title: 'Hábito de Vibe Coding & Registro Rápido',
            desc: 'Você registrou transações via chat em segundos. Manter a consistência diária no chat evita furos no orçamento ao final do mês!',
            action: 'Continuar usando o chat'
        }
    ];

    container.innerHTML = insights.map(item => `
        <div class="insight-card ${item.type}">
            <div class="insight-header">
                <div class="insight-icon ${item.type}">
                    <i data-lucide="${item.icon}"></i>
                </div>
                <h3 class="insight-title">${item.title}</h3>
            </div>
            <p class="insight-body">${item.desc.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
            <span class="insight-action-text"><i data-lucide="arrow-right"></i> ${item.action}</span>
        </div>
    `).join('');

    lucide.createIcons();
}

// ==========================================
// 9. CHAT COM O AGENTE VIBE
// ==========================================
function appendChatMessage(sender, htmlContent, actionCard = null) {
    const messagesContainer = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;

    const iconName = sender === 'bot' ? 'bot' : 'user';
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let actionCardHtml = '';
    if (actionCard) {
        actionCardHtml = `
            <div class="chat-action-card ${actionCard.type}">
                <strong>${actionCard.title}</strong>
                <p style="font-size: 0.8rem; margin-top: 2px;">${actionCard.details}</p>
            </div>
        `;
    }

    msgDiv.innerHTML = `
        <div class="msg-avatar"><i data-lucide="${iconName}"></i></div>
        <div class="msg-bubble">
            <div>${htmlContent}</div>
            ${actionCardHtml}
            <span class="msg-time">${now}</span>
        </div>
    `;

    messagesContainer.appendChild(msgDiv);
    lucide.createIcons();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message bot-message';
    typingDiv.innerHTML = `
        <div class="msg-avatar"><i data-lucide="bot"></i></div>
        <div class="msg-bubble">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const elem = document.getElementById('typingIndicator');
    if (elem) elem.remove();
}

function handleSendMessage(text) {
    if (!text || !text.trim()) return;

    // Mensagem do Usuário
    appendChatMessage('user', text);
    showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator();
        const response = VibeAIEngine.parseUserMessage(text);

        if (response.intent === 'ADD_TRANSACTION') {
            const tx = response.transaction;
            state.transactions.push(tx);
            saveState();
            updateDashboardUI();
            renderTransactionsTable();

            const isIncome = tx.type === 'income';
            const verb = isIncome ? 'receita registrada' : 'gasto anotado';
            const sign = isIncome ? '+' : '-';

            const replyText = `Entendido! Lancei sua ${verb} de <strong>${formatCurrency(tx.amount)}</strong> na categoria <strong>${tx.category}</strong>. Seu saldo foi atualizado em tempo real no Dashboard!`;
            
            appendChatMessage('bot', replyText, {
                type: isIncome ? 'income' : 'expense',
                title: `${isIncome ? '✅ Receita Adicionada' : '💸 Despesa Registrada'}`,
                details: `${tx.desc} • ${sign} ${formatCurrency(tx.amount)} (${tx.category})`
            });
            showToast(`${tx.desc}: ${formatCurrency(tx.amount)} adicionado!`);

        } else if (response.intent === 'CREATE_GOAL') {
            const newGoal = {
                id: 'goal-' + Date.now(),
                title: response.title,
                target: response.target,
                current: 0,
                deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            state.goals.push(newGoal);
            saveState();
            updateDashboardUI();
            renderGoalsCards();

            appendChatMessage('bot', `Excelente iniciativa! Criei a meta <strong>"${newGoal.title}"</strong> com objetivo de <strong>${formatCurrency(newGoal.target)}</strong>. Você pode acompanhar o progresso na aba de Metas.`, {
                type: 'goal',
                title: '🎯 Nova Meta Criada',
                details: `${newGoal.title} — Alvo: ${formatCurrency(newGoal.target)}`
            });
            showToast(`Meta "${newGoal.title}" criada!`);

        } else if (response.intent === 'CHECK_BALANCE') {
            const m = calculateMetrics();
            const reply = `
                Aqui está o resumo financeiro atualizado:
                <br>• <strong>Saldo Atual:</strong> <span style="color: ${m.balance >= 0 ? '#10B981' : '#F43F5E'}">${formatCurrency(m.balance)}</span>
                <br>• <strong>Total de Receitas:</strong> ${formatCurrency(m.totalIncome)}
                <br>• <strong>Total de Despesas:</strong> ${formatCurrency(m.totalExpense)}
                <br>• <strong>Comprometimento:</strong> ${m.expenseRate}% da renda.
            `;
            appendChatMessage('bot', reply);

        } else if (response.intent === 'GET_TIP') {
            const tips = [
                "💡 **Dica de Ouro:** Guarde pelo menos 10% a 20% da sua renda assim que receber o salário, antes de começar a gastar.",
                "💡 **Dica Rápida:** Revise assinaturas mensais recorrentes (streamings, aplicativos que não usa mais). Cancelar 2 assinaturas pode economizar mais de R$ 800 ao ano!",
                "💡 **Dica de Mercado:** Nunca vá às compras com fome e faça sempre uma lista prévia. Isso reduz até 30% dos gastos impulsivos.",
                "💡 **Regra dos 3 Dias:** Se quiser comprar algo supérfluo, espere 72 horas. Se a vontade persistir e couber no orçamento, avalie a compra."
            ];
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            appendChatMessage('bot', randomTip);

        } else {
            appendChatMessage('bot', response.message);
        }
    }, 550);
}

// ==========================================
// 10. EXPORTAÇÃO CSV
// ==========================================
function exportCSV() {
    if (state.transactions.length === 0) {
        showToast('Nenhuma transação para exportar.', 'danger');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Data,Descricao,Categoria,Tipo,Valor,Origem\n";
    state.transactions.forEach(t => {
        csvContent += `"${t.id}","${t.date}","${t.desc}","${t.category}","${t.type}","${t.amount}","${t.origin}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finvibe_extrato_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Extrato CSV exportado com sucesso!');
}

// ==========================================
// 11. INICIALIZAÇÃO & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Telas
    updateDashboardUI();
    renderTransactionsTable();
    renderGoalsCards();
    renderInsights();
    
    // Setar data de hoje nos inputs de data
    const todayStr = new Date().toISOString().split('T')[0];
    const txDateInput = document.getElementById('inputTxDate');
    if (txDateInput) txDateInput.value = todayStr;

    const goalDeadlineInput = document.getElementById('inputGoalDeadline');
    if (goalDeadlineInput) {
        const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        goalDeadlineInput.value = future.toISOString().split('T')[0];
    }

    // 2. Navegação por Abas
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    function switchTab(tabId) {
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        tabPanes.forEach(pane => {
            if (pane.id === `tab-${tabId}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        // Atualizar Título da Página
        const titles = {
            'dashboard': { title: 'Dashboard Financeiro', sub: 'Visão geral do seu patrimônio e fluxo de caixa' },
            'chat': { title: 'Agente IA Conversacional', sub: 'Registre despesas e receba conselhos em linguagem natural' },
            'transactions': { title: 'Extrato & Transações', sub: 'Histórico detalhado e categorizado de movimentações' },
            'goals': { title: 'Metas & Sonhos', sub: 'Planejamento e progresso dos seus objetivos de vida' },
            'insights': { title: 'Hub de Inteligência & Insights', sub: 'Dicas personalizadas e análises automáticas com IA' }
        };

        if (titles[tabId]) {
            document.getElementById('pageTitle').textContent = titles[tabId].title;
            document.getElementById('pageSubtitle').textContent = titles[tabId].sub;
        }

        // Se mobile, fechar sidebar ao clicar
        document.querySelector('.sidebar').classList.remove('open');

        // Atualizar gráficos se for pro dashboard
        if (tabId === 'dashboard') {
            updateDashboardUI();
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
    });

    // Links dentro dos cards do dashboard
    document.querySelectorAll('.link-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });

    document.getElementById('btnGoToChat').addEventListener('click', () => switchTab('chat'));

    // 3. Menu Mobile Toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });

    // 4. Form de Chat
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (msg) {
            handleSendMessage(msg);
            chatInput.value = '';
        }
    });

    // Quick Chips do Chat
    document.querySelectorAll('.chip-btn, .chip-prompt').forEach(chip => {
        chip.addEventListener('click', function() {
            const query = this.getAttribute('data-query') || this.textContent.replace(/"/g, '');
            chatInput.value = query;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    document.getElementById('btnClearChat').addEventListener('click', () => {
        document.getElementById('chatMessages').innerHTML = `
            <div class="message bot-message">
                <div class="msg-avatar"><i data-lucide="bot"></i></div>
                <div class="msg-bubble">
                    <p>Conversa reiniciada! Como posso te ajudar com as suas finanças agora?</p>
                </div>
            </div>
        `;
        lucide.createIcons();
    });

    // 5. Botão Superior "Conversar com IA"
    document.getElementById('btnOpenAiModal').addEventListener('click', () => {
        switchTab('chat');
        chatInput.focus();
    });

    // 6. Modais: Nova Transação Manual
    const modalTx = document.getElementById('modalTransaction');
    document.getElementById('btnQuickExpense').addEventListener('click', () => {
        modalTx.style.display = 'flex';
    });
    document.getElementById('btnCloseTxModal').addEventListener('click', () => modalTx.style.display = 'none');
    document.getElementById('btnCancelTxModal').addEventListener('click', () => modalTx.style.display = 'none');

    // Troca visual radio tipo transação
    const radioExpenses = document.querySelectorAll('input[name="txType"]');
    radioExpenses.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const labelExp = document.getElementById('labelExpenseRadio');
            const labelInc = document.getElementById('labelIncomeRadio');
            if (e.target.value === 'expense') {
                labelExp.className = 'radio-type-label expense-active';
                labelInc.className = 'radio-type-label';
            } else {
                labelInc.className = 'radio-type-label income-active';
                labelExp.className = 'radio-type-label';
            }
        });
    });

    document.getElementById('formManualTransaction').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="txType"]:checked').value;
        const desc = document.getElementById('inputTxDesc').value;
        const amount = parseFloat(document.getElementById('inputTxAmount').value);
        const category = document.getElementById('inputTxCategory').value;
        const date = document.getElementById('inputTxDate').value;

        const newTx = {
            id: 'tx-' + Date.now(),
            desc,
            amount,
            type,
            category,
            date,
            origin: 'Manual'
        };

        state.transactions.push(newTx);
        saveState();
        updateDashboardUI();
        renderTransactionsTable();

        modalTx.style.display = 'none';
        document.getElementById('formManualTransaction').reset();
        document.getElementById('inputTxDate').value = todayStr;
        showToast('Transação salva com sucesso!');
    });

    // 7. Modais: Nova Meta
    const modalGoal = document.getElementById('modalGoal');
    document.getElementById('btnOpenNewGoalModal').addEventListener('click', () => {
        modalGoal.style.display = 'flex';
    });
    document.getElementById('btnCloseGoalModal').addEventListener('click', () => modalGoal.style.display = 'none');
    document.getElementById('btnCancelGoalModal').addEventListener('click', () => modalGoal.style.display = 'none');

    document.getElementById('formGoal').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('inputGoalTitle').value;
        const target = parseFloat(document.getElementById('inputGoalTarget').value);
        const current = parseFloat(document.getElementById('inputGoalCurrent').value) || 0;
        const deadline = document.getElementById('inputGoalDeadline').value;

        const newGoal = {
            id: 'goal-' + Date.now(),
            title,
            target,
            current,
            deadline
        };

        state.goals.push(newGoal);
        saveState();
        renderGoalsCards();
        updateDashboardUI();

        modalGoal.style.display = 'none';
        document.getElementById('formGoal').reset();
        showToast(`Meta "${title}" criada com sucesso!`);
    });

    // 8. Modal: Aporte em Meta
    const modalDeposit = document.getElementById('modalDepositGoal');
    document.getElementById('btnCloseDepositGoalModal').addEventListener('click', () => modalDeposit.style.display = 'none');
    document.getElementById('btnCancelDepositGoalModal').addEventListener('click', () => modalDeposit.style.display = 'none');

    document.getElementById('formDepositGoal').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('depositGoalId').value;
        const amount = parseFloat(document.getElementById('inputDepositAmount').value);

        const goal = state.goals.find(g => g.id === id);
        if (goal) {
            goal.current += amount;
            saveState();
            renderGoalsCards();
            updateDashboardUI();
            modalDeposit.style.display = 'none';
            showToast(`Aporte de ${formatCurrency(amount)} adicionado a "${goal.title}"!`);
        }
    });

    // 9. Filtros de Transações
    document.getElementById('txSearchInput').addEventListener('input', renderTransactionsTable);
    document.getElementById('txFilterType').addEventListener('change', renderTransactionsTable);
    document.getElementById('txFilterCategory').addEventListener('change', renderTransactionsTable);
    document.getElementById('btnExportCSV').addEventListener('click', exportCSV);

    // 10. Atualizar Insights
    document.getElementById('btnRefreshInsights').addEventListener('click', () => {
        renderInsights();
        showToast('Insights financeiros recalculados!');
    });
});
