/* Get Events: Busca os eventos */
document.addEventListener("DOMContentLoaded", () => {
    // Containers específicos para cada filtro
    const allEventsContainer = document.getElementById("events-container-all");
    const groupedByCategoryContainer = document.getElementById("events-container-category");
    const mostBetsContainer = document.getElementById("events-container-bets");
    const finishingContainer = document.getElementById("events-container-finishing");
  
    // Função genérica para buscar eventos
    const fetchEvents = async (filter) => {
      try {
        const response = await fetch("http://localhost:3000/getEvents", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "filter": filter,
          },
        });
        if (!response.ok) throw new Error(`Erro ao buscar eventos (${filter}).`);
        const events = await response.json();
        renderEvents(events, filter);
      } catch (error) {
        console.error(`Erro ao carregar eventos (${filter}):`, error);
        renderError(filter);
      }
    };
  
    // Renderiza eventos no container correto
    const renderEvents = (events, filter) => {
      let container;
      switch (filter) {
        case "all_events":
          container = allEventsContainer;
          break;
        case "agrupados_por_categoria":
          container = groupedByCategoryContainer;
          break;
        case "mais_apostas":
          container = mostBetsContainer;
          break;
        case "finalizando":
          container = finishingContainer;
          break;
      }
  
      // Limpa o container antes de renderizar
      container.innerHTML = "";
      if (events.length === 0) {
        container.innerHTML = "<p class='no-events pd-top-30'>Nenhum evento encontrado.</p>";
        return;
      }
  
      // Adiciona cada card no container
      events.forEach((event) => {
        const eventCard = `
          <div class="card">
            <div class="card-header">
              <span class="card-category">
                <div class="category">📌 ${event.category}</div>
                <svg class="category-icon" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.7542 11.1529C8.35634 11.6157 7.64366 11.6157 7.2458 11.1529L4.24545 7.66298C3.68586 7.01207 4.14485 6 4.99964 6L11.0004 6C11.8551 6 12.3141 7.01207 11.7546 7.66298L8.7542 11.1529Z"></path>
                </svg>
                <div class="cat-name">${event.name}</div>
              </span>
              <span class="card-date">${formatDate(event.start_date)} - ${formatDate(event.end_date)}</span>
            </div>        
            <div class="card-body">
              <p class="event-question">
                Quota: R$${event.quota} | Approved: ${event.approved ? "Yes" : "No"} | Participations: ${event.bet_count ?? 0}
              </p>
            </div>
            <div class="card-footer">
              <div class="event-container">
                <a class="event-details-link" href="#modalEvent">Ver detalhes do evento</a>
              </div>
            </div>
          </div>`;
        
        // Inserir o card no container
        container.innerHTML += eventCard;
      });
  
      // Agora inicializamos o IntersectionObserver
      animateCardsOnVisibility(container);
    };
  
    // Exibe mensagem de erro no container correspondente
    const renderError = (filter) => {
      let container;
      switch (filter) {
        case "all_events":
          container = allEventsContainer;
          break;
        case "agrupados_por_categoria":
          container = groupedByCategoryContainer;
          break;
        case "mais_apostas":
          container = mostBetsContainer;
          break;
        case "finalizando":
          container = finishingContainer;
          break;
      }
      container.innerHTML = "<p class='error'>Erro ao carregar eventos. Tente novamente mais tarde.</p>";
    };
  
    // Formata data
    const formatDate = (isoDate) => {
      const date = new Date(isoDate);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    };
  
    // Busca e renderiza eventos para todos os filtros
    fetchEvents("all_events");
    fetchEvents("agrupados_por_categoria");
    fetchEvents("mais_apostas");
    fetchEvents("finalizando");
  });
  
  // Função que observa quando o card entra na tela e anima
  const animateCardsOnVisibility = (container) => {
    if (!container) return;

    const observer = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Quando o card se torna visível, adiciona a classe "visible"
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Para de observar o elemento
                }
            });
        },
        { threshold: 0.5 } // 50% do card precisa estar visível
    );

    // Seleciona e observa os novos cards
    const cards = container.querySelectorAll('.card:not(.visible)');
    cards.forEach(card => observer.observe(card));
};



document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("eventModal");
  const closeModal = document.getElementById("closeModal");
  const form = document.getElementById("eventForm");

  // Abrir Modal
  document.querySelector(".modal-btn").addEventListener("click", () => {
      modal.style.display = "flex";
  });

  // Fechar Modal
  closeModal.addEventListener("click", () => {
      modal.style.display = "none";
  });

  // Fechar ao clicar fora do modal
  window.addEventListener("click", (e) => {
      if (e.target === modal) {
          modal.style.display = "none";
      }
  });

  // Submissão do formulário com integração ao backend
  form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Impede o comportamento padrão de envio

      const token = localStorage.getItem("authToken"); // Pegando o token do localStorage

      if (!token) {
          alert("Token de autenticação não encontrado.");
          return;
      }

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

          // Coletar os dados do formulário
          const formData = {
              name: document.getElementById("eventTitle").value, // Nome do evento
              category: document.getElementById("eventCategory").value, // Categoria do evento
              quota: parseFloat(document.getElementById("quota").value), // Preço da quota
              start_date: document.getElementById("eventDate").value + " " + document.getElementById("eventTime").value, // Data e hora de início
              end_date: document.getElementById("eventDateEnd").value + " " + document.getElementById("eventTimeEnd").value, // Data e hora de fim
              creator_CPF: cpfResult.cpf, // CPF obtido pelo token
          };

          // Fazer a requisição para o servidor (enviando os dados com o método PUT)
          const response = await fetch("http://localhost:3000/addNewEvent", {
            method: "PUT", // O backend espera os dados via GET (conforme seu handler)
            headers: {
                "Content-Type": "application/json",
                "name": formData.name,
                "category": formData.category,
                "quota": formData.quota.toString(), // Convertendo para string
                "start_date": formData.start_date,
                "end_date": formData.end_date,
                "creator_CPF": cpfResult.cpf.toString() // Convertendo para string
            }
        });

          const result = await response.text(); // Pega a mensagem retornada pelo backend

          if (response.ok) {
              alert(result);
              modal.style.display = "none"; // Fecha o modal
              form.reset(); // Limpa o formulário
          } else {
              alert("Erro ao criar o evento: " + result);
          }
      } catch (error) {
          console.error("Erro ao enviar formulário:", error);
          alert("Ocorreu um erro inesperado. Tente novamente mais tarde.");
      }
  });
});


/* Busca de eventos dinmicamente por palavra chave */
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const searchMessage = document.getElementById("search-message");
    const eventsContainer = document.getElementById("events-container");

    let debounceTimeout; // Variável para armazenar o tempo do debounce

    // Função para formatar a data
    const formatDate = (isoDate) => {
      const date = new Date(isoDate);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    };

    // Função para buscar eventos do servidor
    const fetchEvents = async (keyword) => {
      try {
        const response = await fetch("http://localhost:3000/searchEvent", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "keyword": keyword,
          },
        });
    
        if (!response.ok) {
          const errorData = await response.json();  // Tenta pegar o erro retornado
          throw new Error(errorData.message || 'Erro desconhecido');
        }
    
        const events = await response.json();
        renderEvents(events, keyword);
      } catch (error) {
        console.error("Erro ao carregar eventos:", error); // Aqui já imprime o erro
        renderError(keyword);
      }
    };
    
    

    // Renderiza os eventos
    const renderEvents = (events, keyword) => {
      // Exibe a mensagem com o texto pesquisado
      searchMessage.innerHTML = `Resultados da busca: <strong>${keyword}</strong>`;

      // Limpa o container antes de renderizar novos eventos
      eventsContainer.innerHTML = "";

      if (events.length === 0) {
        eventsContainer.innerHTML = "<p class='no-events'>Nenhum evento encontrado.</p>";
        return;
      }

      // Adiciona cada card no container
      events.forEach((event) => {
        const eventCard = `
          <div class="card">
            <div class="card-header">
              <span class="card-category">
                <div class="category">📌 ${event.category}</div>
                <svg class="category-icon" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.7542 11.1529C8.35634 11.6157 7.64366 11.6157 7.2458 11.1529L4.24545 7.66298C3.68586 7.01207 4.14485 6 4.99964 6L11.0004 6C11.8551 6 12.3141 7.01207 11.7546 7.66298L8.7542 11.1529Z"></path>
                </svg>
                <div class="cat-name">${event.name}</div>
              </span>
              <span class="card-date">${formatDate(event.start_date)} - ${formatDate(event.end_date)}</span>
            </div>        
            <div class="card-body">
              <p class="event-question">
                Quota: R$${event.quota} | Approved: ${event.approved ? "Yes" : "No"} | Participations: ${event.bet_count ?? 0}
              </p>
            </div>
            <div class="card-footer">
              <div class="event-container">
                <a class="event-details-link" href="#modalEvent">Ver detalhes do evento</a>
              </div>
            </div>
          </div>`;
        eventsContainer.innerHTML += eventCard;
      });

      // Adicionar a classe "visible" após o conteúdo ser inserido
      const cards = eventsContainer.querySelectorAll('.card');
      setTimeout(() => {
        cards.forEach(card => {
          card.classList.add('visible');
        });
      }, 100); // Pequeno atraso para garantir que os elementos sejam renderizados antes de aplicar a transição
    };

    // Exibe mensagem de erro
    const renderError = (keyword) => {
      searchMessage.innerHTML = `Nenhum resultado para: <strong>${keyword}</strong>`;
      eventsContainer.innerHTML = "";
    };

    // Função de debounce
    const debounce = (func, delay) => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(func, delay);
    };

    // Evento ao digitar no input
    searchInput.addEventListener("input", () => {
      const keyword = searchInput.value.trim();
      if (keyword) {
        // Usando debounce para fazer a busca após 0.5s
        debounce(() => fetchEvents(keyword), 500);
      } else {
        searchMessage.innerHTML = "";
        eventsContainer.innerHTML = "";
      }
    });
});

/* Modal: Sign In */
document.addEventListener('DOMContentLoaded', () => {
  const openModalSignIn = document.getElementById('openModalSignIn');
  const signInModal = document.getElementById('signInModal');
  const closeModalSignIn = document.getElementById('closeModalSignIn');

  openModalSignIn.addEventListener('click', () => {
      signInModal.style.display = 'flex';
  });


  closeModalSignIn.addEventListener('click', () => {
    signInModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
      if (event.target === signInModal) {
          signInModal.style.display = 'none';
      }
  });
});

/* Modal: Sign Up */
document.addEventListener('DOMContentLoaded', () => {
  const openModalSignUp = document.getElementById('openModalSignUp');
  const signUpModal = document.getElementById('signUpModal');
  const closeModalSignUp = document.getElementById('closeModalSignUp');

  openModalSignUp.addEventListener('click', () => {
      signUpModal.style.display = 'flex';
  });


  closeModalSignUp.addEventListener('click', () => {
    signUpModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
      if (event.target === signUpModal) {
        signUpModal.style.display = 'none';
      }
  });
});


/* Login Fetch Requisition */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("SignInForm");

  form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Impede o comportamento padrão de envio

      // Coletar os dados do formulário
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
          // Fazer a requisição para o servidor
          const response = await fetch("http://localhost:3000/login", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "email": email,
                  "password": password,
              },
          });

          const result = await response.json(); // Resultado do backend

          if (response.ok) {
              // Armazenar o token e a role no localStorage
              localStorage.setItem("authToken", result.token);  // Armazenar o token
              localStorage.setItem("userRole", result.role);    // Armazenar a role
              console.log(result.role);
              console.log(result.token);
              alert(`${result.message}`);
              window.location.reload();
          } else {
              alert(`${result.message}`); // Mensagem de erro do backend
          }
      } catch (error) {
          console.error("Erro ao conectar ao servidor:", error);
          alert("Erro ao conectar ao servidor. Verifique sua conexão." + error);
      }
  });
});

/* Header Management */
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


          // Exibir o cabeçalho de usuário logado e ocultar o de não logado
          document.getElementById('header-logged-in').style.display = 'block';
          document.getElementById('header-logged-out').style.display = 'none';

          // Exibir o saldo formatado
          const formattedBalance = `R$ ${walletResult.balance.toFixed(2).replace('.', ',')}`;
          document.getElementById('balance-amount').textContent = formattedBalance;

          // Agora, exibe o nome do usuário e altera o botão para "Depositar"
          const userNameElement = document.getElementById('user-name');
          const welcomeMessage = document.getElementById('welcome-message');
          const signupButton = document.getElementById('signup-button');

          // Atualiza a interface com o nome do usuário e altera o botão de cadastro
          welcomeMessage.innerHTML = `Welcome to PUC BET!`;
          signupButton.innerHTML = 'Depositar'; // Substitui o botão de "Cadastrar-se" por "Depositar"
          
          // Atualiza o subtítulo para refletir a mudança solicitada
          document.querySelector('.welcome-subtitle').textContent = 'Deposite qualquer valor e comece a apostar!';

      } catch (error) {
          console.error('Erro ao obter dados do usuário:', error);
      }
  } else {
      // Caso o token não esteja presente, o cabeçalho de login será exibido
      document.getElementById('header-logged-out').style.display = 'block';
      document.getElementById('header-logged-in').style.display = 'none';

      // Atualiza a interface para o estado de não logado
      const welcomeMessage = document.getElementById('welcome-message');
      const signupButton = document.getElementById('signup-button');
      
      welcomeMessage.innerHTML = `Welcome to PUC BET!`;
      signupButton.innerHTML = 'Cadastre-se'; // Exibe o botão de cadastro novamente

      // Altera o subtítulo de boas-vindas para o estado de não logado
      document.querySelector('.welcome-subtitle').textContent = 'Faça seu cadastro, deposite qualquer valor e comece a apostar!';
  }
});

document.getElementById('SignUpForm').addEventListener('submit', async function (event) {
  event.preventDefault(); // Impede o comportamento padrão do formulário

  // Captura os dados do formulário no momento da submissão
  const form = event.target;
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('signUpEmail').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const birthdate = document.getElementById('birthdate').value.trim();
  const cpf = document.getElementById('cpf').value.trim();
  const password = document.getElementById('password').value.trim();

  console.log("Dados enviados:", { name, email, phone, birthdate, cpf, password });

  // Verifica se todos os campos foram preenchidos
  if (!name || !email || !phone || !birthdate || !cpf || !password) {
    alert('Por favor, preencha todos os campos!');
    return;
  }

  try {
    // Envia os dados para o backend
    const response = await fetch('http://localhost:3000/signUp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CPF': cpf,
        'name': name,
        'email': email,
        'phoneNumber': phone,
        'birthdate': birthdate,
        'password': password,
      },
    });

    const data = await response.text(); // Obtém a resposta do servidor

    if (response.ok) {
      alert('Cadastro realizado com sucesso!');
      form.reset(); // Limpa os campos do formulário
      window.location.reload();
    } else {
      alert(`Erro ao cadastrar: ${data}`);
    }
  } catch (error) {
    console.error('Erro ao enviar a requisição:', error);
    alert('Ocorreu um erro. Tente novamente mais tarde.');
  }
});


document.getElementById('signUpModal').addEventListener('show', () => { 
  document.getElementById('SignUpForm').reset();
});
