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
 document.getElementById("amount").addEventListener("input", function() {
      let value = this.value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos

      if (value === '') {
        this.value = 'R$ 00,00'; // Caso o campo seja limpo, exibe 'R$ 00,00'
        return;
      }

      let formattedValue = '';

      // Se o valor tem menos de 3 dígitos, coloca os valores nos centavos
      if (value.length <= 2) {
        formattedValue = '00,' + value.padStart(2, '0'); // Preenche com zeros à esquerda para formar centavos
      } else {
        // Se o valor tem mais de 2 dígitos, formata corretamente
        let cents = value.slice(-2); // Os dois últimos dígitos são os centavos
        let whole = value.slice(0, -2); // O restante são os reais
        formattedValue = whole + ',' + cents; // Formata como reais e centavos
      }

      // Remove zeros à esquerda após o número inteiro
      formattedValue = formattedValue.replace(/^0+(?=\d)/, '');

      // Adiciona 'R$ ' na frente do valor formatado
      this.value = 'R$ ' + formattedValue;
    });
function updateWithdrawFields() {
        const pixFields = document.getElementById('pix-fields');
        const bankFields = document.getElementById('bank-fields');
        const isPixSelected = document.getElementById('pix').checked;
      
        if (isPixSelected) {
          pixFields.classList.remove('hidden');
          bankFields.classList.add('hidden');
        } else {
          pixFields.classList.add('hidden');
          bankFields.classList.remove('hidden');
        }
      }
// Adiciona o evento de entrada ao campo de CPF
document.getElementById("cpf").addEventListener("input", function () {
    let value = this.value.replace(/\D/g, ""); // Remove todos os caracteres não numéricos
  
    if (value === "") {
      this.value = ""; // Caso o campo seja limpo, exibe vazio
      return;
    }
  
    // Formata o CPF automaticamente
    let formattedValue = "";
  
    if (value.length <= 3) {
      formattedValue = value; // Apenas os primeiros números
    } else if (value.length <= 6) {
      formattedValue = value.slice(0, 3) + "." + value.slice(3); // 000.000
    } else if (value.length <= 9) {
      formattedValue =
        value.slice(0, 3) + "." + value.slice(3, 6) + "." + value.slice(6); // 000.000.000
    } else {
      formattedValue =
        value.slice(0, 3) +
        "." +
        value.slice(3, 6) +
        "." +
        value.slice(6, 9) +
        "-" +
        value.slice(9, 11); // 000.000.000-00
    }
  
    this.value = formattedValue;
  });
// Adiciona o evento de entrada ao campo de Agência/Conta
document.getElementById("agency").addEventListener("input", function () {
    let value = this.value.replace(/\D/g, ""); // Remove todos os caracteres não numéricos
  
    if (value === "") {
      this.value = ""; // Caso o campo seja limpo, exibe vazio
      return;
    }
  
    // Formata o campo automaticamente
    let formattedValue = "";
  
    if (value.length <= 4) {
      formattedValue = value; // Apenas a agência (0000)
    } else if (value.length <= 10) {
      formattedValue = value.slice(0, 4) + "/" + value.slice(4); // 0000/00001
    } else {
      formattedValue =
        value.slice(0, 4) + "/" + value.slice(4, 9) + "-" + value.slice(9); // 0000/00001-0
    }
  
    this.value = formattedValue;
  });
document.getElementById("Card-Number").addEventListener("input", function () {
    let value = this.value.replace(/\D/g, ""); // Remove todos os caracteres que não são números
  
    // Limita o valor a 16 números
    if (value.length > 16) {
      value = value.slice(0, 16);
    }
  
    // Adiciona o espaçamento a cada 4 números
    let formattedValue = value.match(/.{1,4}/g)?.join(" ") || ""; 
  
    this.value = formattedValue;
  });
// Adiciona o evento de entrada ao campo de CVV
document.getElementById("CVV").addEventListener("input", function () {
    let value = this.value.replace(/\D/g, ""); // Remove todos os caracteres que não são números
  
    // Limita o valor a 3 dígitos
    if (value.length > 3) {
      value = value.slice(0, 3);
    }
  
    this.value = value; // Atualiza o valor no campo
  });
// Adiciona o evento de entrada ao campo do banco
document.getElementById("bank").addEventListener("input", function () {
    let value = this.value.replace(/[0-9]/g, ''); // Remove todos os números
  
    this.value = value; // Atualiza o valor no campo
  });
  
