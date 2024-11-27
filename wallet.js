function showModal(event) {
    event.preventDefault(); // Impede o envio do formulário
    const depositRadio = document.getElementById('deposit');
    const withdrawRadio = document.getElementById('withdraw');
    const modalDeposit = document.getElementById('modal-deposit');
    const modalWithdraw = document.getElementById('modal-withdraw');
    const backdrop = document.getElementById('modal-backdrop');

    // Verifica qual botão de rádio está selecionado
    if (depositRadio.checked) {
        modalDeposit.classList.add('show');
    } else if (withdrawRadio.checked) {
        modalWithdraw.classList.add('show');
    }
    backdrop.classList.add('show'); // Mostra o backdrop
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    const backdrop = document.getElementById('modal-backdrop');

    modals.forEach(modal => modal.classList.remove('show'));
    backdrop.classList.remove('show'); // Esconde o backdrop
}
  
async function fetchBets() {
    try {
        const response = await fetch('http://localhost/getBets'); // Ajuste para o seu endpoint
        if (response) {
            const bets = await response.json();
            populateTable(bets);
        } else {
            console.error('Erro ao buscar as apostas:', response.statusText);
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
    }
}

// Função para popular a tabela com os dados recebidos
function populateTable(bets) {
    const tableBody = document.querySelector('#betsTable tbody');
    tableBody.innerHTML = ''; // Limpa a tabela antes de preencher
    bets.forEach(bet => {
    const choiceText = bet.CHOICE === 1 ? 'Acontecerá' : 'Não acontecerá';
    const row = `
        <tr>
        <td>${bet.EVENT_NAME}</td>
        <td>${parseFloat(bet.BET_VALUE).toFixed(2)}</td>
        <td>${choiceText}</td>
        </tr>`;
    tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// Carregar as apostas assim que a página for carregada
document.addEventListener('DOMContentLoaded', fetchBets);

function confirmTransaction() {
    const depositRadio = document.getElementById('deposit');
    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value);
  
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }
  
    if (depositRadio.checked) {
      depositar(amount);
    } else {
      sacar(amount);
    }
    
    // Fecha o modal após a transação
    closeModal();
    amountInput.value = ''; // Limpa o campo de valor
}

function depositar(valor) {
    saldoAtual += valor;
    atualizarSaldo();
    alert(`Depósito de R$ ${valor.toFixed(2)} realizado com sucesso!`);
}


// Realiza o saque
function sacar(valor) {
    if (valor > saldoAtual) {
        alert('Saldo insuficiente para realizar o saque.');
        return;
    }

    saldoAtual -= valor;
    atualizarSaldo();
    alert(`Saque de R$ ${valor.toFixed(2)} realizado com sucesso!`);
}