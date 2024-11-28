document.getElementById("submitTransaction").addEventListener("click", showModal);

function showModal(event) {
  event.preventDefault(); // Impede o envio do formulário, caso esteja dentro de um <form>
  
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

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken"); // Pegando o token do localStorage

  if (token) {
    try {
      // Requisição para pegar o CPF do usuário associado ao token
      const cpfResponse = await fetch('http://localhost:3000/getCPFbyToken', {
        method: 'GET',
        headers: {
          'token': token
        }
      });

      const cpfResult = await cpfResponse.json();
      if (!cpfResult.cpf) {
        throw new Error('CPF não encontrado');
      }

      // Requisição para pegar o saldo da carteira do usuário
      const walletResponse = await fetch('http://localhost:3000/getWalletBalance', {
        method: 'GET',
        headers: {
          'token': token
        }
      });

      const walletResult = await walletResponse.json();
      if (walletResult.balance == null) { // Verifica se é null ou undefined
        throw new Error('Saldo não encontrado');
      }

      // Exibir o saldo formatado
      const formattedBalance = `R$ ${walletResult.balance.toFixed(2).replace('.', ',')}`;
      document.getElementById('balance').textContent = formattedBalance;

    } catch (error) {
      console.error('Erro ao obter saldo da carteira:', error);
    }
  }
});

// Exemplo de atualização do saldo após a adição de fundos
const updateBalance = async () => {
  try {
    const response = await fetch('http://localhost:3000/getWalletBalance', {
      method: 'GET',
      headers: {
        'token': localStorage.getItem('authToken') // Passa o token para autenticação
      }
    });
    const wallet = await response.json();
    if (wallet.balance !== undefined) {
      const formattedBalance = `R$ ${wallet.balance.toFixed(2).replace('.', ',')}`;
      document.getElementById('balance').textContent = formattedBalance; // Atualiza o saldo na página
    }
  } catch (error) {
    console.error('Erro ao atualizar saldo:', error);
  }
};



document.addEventListener("DOMContentLoaded", async () => {
  // Função para pegar o CPF do usuário
  const getUserCpf = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert("Você precisa estar logado para apostar.");
      return null;
    }

    try {
      const response = await fetch('http://localhost:3000/getCPFbyToken', {
        method: 'GET',
        headers: {
          'token': token,
        }
      });
      const data = await response.json();
      if (response.ok) {
        return data.cpf;
      } else {
        throw new Error(data.message || "Erro ao obter CPF.");
      }
    } catch (error) {
      console.error("Erro ao obter CPF:", error);
      alert("Erro ao recuperar o CPF.");
      return null;
    }
  };

  const userCpf = await getUserCpf();
  if (!userCpf) return;
      
  // Evento do formulário de adição de fundos
  const form = document.getElementById("transaction-form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Pegando os dados do formulário
    const amount = parseFloat(document.getElementById("amount").value);
    const paymentMethod = 'Credit Card';
    const cardNumber = document.getElementById("Card-Number")?.value;
    const expiryDate = document.getElementById("Expiry-Data")?.value;
    const cvv = document.getElementById("CVV")?.value;

    if (amount <= 0 || !paymentMethod || !cardNumber || !expiryDate || !cvv) {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }

    const addFundsData = {
      cpf: userCpf,
      amountAdd: amount,
      paymentMethod: paymentMethod,
      cardNumber: cardNumber,
      expiryDate: expiryDate,
      cvv: cvv
    };

    console.log(addFundsData);
    

    // Fazendo a requisição para adicionar fundos
    try {
      const response = await fetch('http://localhost:3000/addFunds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CPF': addFundsData.cpf,
          'amountAdd': addFundsData.amountAdd,
          'paymentMethod': addFundsData.paymentMethod,
          'cardNumber': addFundsData.cardNumber,
          'expiryDate': addFundsData.expiryDate,
          'cvv': addFundsData.cvv

        }
        });

        const result = await response.text(); // Pega a mensagem retornada pelo backend

        if (response.ok) {
          alert(result);
          form.reset();
          location.reload(); 
        } else {
          alert(result);
        }
      } catch (error) {
      console.error("Erro ao enviar formulário:", error);
      alert("Ocorreu um erro inesperado. Tente novamente mais tarde.");
    }
  });
});






document.addEventListener("DOMContentLoaded", async () => {
  // Função para pegar o CPF do usuário
  const getUserCpf = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert("Você precisa estar logado para realizar um saque.");
      return null;
    }

    try {
      const response = await fetch('http://localhost:3000/getCPFbyToken', {
        method: 'GET',
        headers: {
          'token': token,
        }
      });
      const data = await response.json();
      if (response.ok) {
        return data.cpf;
      } else {
        throw new Error(data.message || "Erro ao obter CPF.");
      }
    } catch (error) {
      console.error("Erro ao obter CPF:", error);
      alert("Erro ao recuperar o CPF.");
      return null;
    }
  };

  const userCpf = await getUserCpf();
  if (!userCpf) return;
  
  // Atualiza os campos visíveis dependendo do método de saque (Pix ou Transferência Bancária)
  const updateWithdrawFields = () => {
    const pixFields = document.getElementById("pix-fields");
    const bankFields = document.getElementById("bank-fields");
    const isPix = document.getElementById('pix').checked;

    if (isPix) {
      pixFields.classList.remove('hidden');
      bankFields.classList.add('hidden');
    } else {
      pixFields.classList.add('hidden');
      bankFields.classList.remove('hidden');
    }
  };

  // Função para confirmar o saque
const confirmWithdraw = async () => {
  const amount = parseFloat(document.getElementById("withdraw-amount").value);
  const paymentMethod = document.getElementById('pix').checked ? 'pix' : 'AccountBank';
  const cpf = document.getElementById("cpf")?.value;
  const bank = document.getElementById("bank")?.value;
  const agency = document.getElementById("agency")?.value;
  const accountNumber = document.getElementById("accountNumber")?.value;
  const pixKey = paymentMethod === 'pix' ? cpf : null; // CPF usado como chave Pix

  // Validação dos campos
  if (amount <= 0 || !paymentMethod) {
    alert("Por favor, preencha todos os campos corretamente.");
    return;
  }

  // Dados do saque (separando por tipo de pagamento)
  const withdrawDataPix = {
    cpf: userCpf,
    amountWithdraw: amount,
    paymentMethod: 'pix',
    cardNumber: pixKey // Chave Pix (CPF)
  };

  const withdrawDataAccountBank = {
    cpf: userCpf,
    amountWithdraw: amount,
    paymentMethod: 'AccountBank',
    bank: bank, // Banco
    agency: agency, // Agência / Número da conta
    accountNumber: accountNumber
  };

  console.log(withdrawDataAccountBank);

  try {
    let response;
    // Verifica se o pagamento é por Pix ou Transferência Bancária
    if (withdrawDataPix.paymentMethod === 'pix') {
      response = await fetch('http://localhost:3000/withdrawFunds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CPF': withdrawDataPix.cpf,
          'amountWithdraw': withdrawDataPix.amountWithdraw,
          'paymentMethod': withdrawDataPix.paymentMethod,
          'pixKey': withdrawDataPix.cardNumber
          }
      });
    } else if (withdrawDataAccountBank.paymentMethod === 'AccountBank') {
      response = await fetch('http://localhost:3000/withdrawFunds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CPF': withdrawDataPix.cpf,
          'amountWithdraw': withdrawDataAccountBank.amountWithdraw,
          'paymentMethod': withdrawDataAccountBank.paymentMethod,
          'bank': withdrawDataAccountBank.bank,
          'agency': withdrawDataAccountBank.agency,
          'accountNumber': withdrawDataAccountBank.accountNumber
          }
      });
    }
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      closeModal(); // Fecha o modal após o saque
    } else {
      alert(result.message || "Erro ao realizar o saque.");
    }
  } catch (error) {
    console.error('Erro ao realizar o saque:', error);
    alert("Ocorreu um erro ao realizar o saque.");
  }
};

  // Expor a função para o HTML
  window.updateWithdrawFields = updateWithdrawFields;
  window.confirmWithdraw = confirmWithdraw;
});
