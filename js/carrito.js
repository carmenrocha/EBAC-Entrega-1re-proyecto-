'use strict';

const CLAVE_CARRITO = 'erebus_carrito';

const PAGINAS = [
  ['index.html', 'Inicio'],
  ['maquillaje.html', 'Productos'],
  ['regalos.html', 'Regalos'],
  ['cuidado-facial.html', 'Cuidado Facial'],
  ['nosotros.html', 'Nosotros'],
  ['contacto.html', 'Contacto']
];

const formatearPrecio = (valor) => `$${Number(valor).toLocaleString('en-US')} COP`;

const limpiarTexto = (texto) => texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');


const crearElemento = (etiqueta, clase = '', ...contenido) => {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  elemento.append(...contenido);
  return elemento;
};

const crearBoton = (clase, accion, texto, etiqueta = '') => {
  const boton = crearElemento('button', clase, texto);
  boton.type = 'button';
  boton.dataset.accion = accion;
  if (etiqueta) boton.setAttribute('aria-label', etiqueta);
  return boton;
};

class Carrito {
  constructor(clave = CLAVE_CARRITO) {
    this.clave = clave;
    this.productos = this.cargar();
  }

  cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(this.clave));
      return Array.isArray(guardado) ? guardado : [];
    } catch (error) {
      return [];
    }
  }

  guardar() {
    try {
      localStorage.setItem(this.clave, JSON.stringify(this.productos));
    } catch (error) {
    }
  }

  agregar({ id, nombre, precio, imagen }) {
    const existente = this.productos.find((producto) => producto.id === id);
    if (existente) {
      existente.cantidad++;
    } else {
      this.productos = [...this.productos, { id, nombre, precio, imagen, cantidad: 1 }];
    }
    this.guardar();
  }

  cambiarCantidad(id, cambio) {
    const producto = this.productos.find((item) => item.id === id);
    if (!producto) return;
    producto.cantidad += cambio;
    if (producto.cantidad <= 0) this.quitar(id);
    else this.guardar();
  }

  quitar(id) {
    this.productos = this.productos.filter((producto) => producto.id !== id);
    this.guardar();
  }

  vaciar() {
    this.productos = [];
    this.guardar();
  }

  cantidadTotal() {
    return this.productos.reduce((suma, { cantidad }) => suma + cantidad, 0);
  }

  precioTotal() {
    return this.productos.reduce((suma, { precio, cantidad }) => suma + precio * cantidad, 0);
  }
}

const carrito = new Carrito();

const navbar = document.querySelector('.navbar-erebus');
const marca = document.querySelector('.navbar-erebus .navbar-brand');
const btnCarrito = document.querySelector('.navbar-erebus__carrito');

const iconoMenu = crearElemento('img', 'navbar-erebus__menu-icono');
iconoMenu.src = 'img/menu.svg';
iconoMenu.alt = '';
const btnMenu = crearElemento('button', 'navbar-erebus__menu', iconoMenu);
btnMenu.type = 'button';
btnMenu.id = 'btnMenuLateral';
btnMenu.setAttribute('aria-label', 'Abrir menú lateral');
btnMenu.setAttribute('aria-controls', 'erMenu');
if (marca) marca.before(btnMenu);

const insignia = crearElemento('span', 'navbar-erebus__badge', '0');
insignia.id = 'carritoBadge';
insignia.hidden = true;
if (btnCarrito) {
  btnCarrito.id = 'btnCarrito';
  btnCarrito.append(insignia);
}

let paginaActual = location.pathname.split('/').pop() || 'index.html';
if (!paginaActual.includes('.')) paginaActual += '.html';

const enlacesMenu = PAGINAS.map(([archivo, texto]) => {
  const activo = archivo === paginaActual;
  return `<a href="${archivo}" class="menu-lateral__enlace${activo ? ' menu-lateral__enlace--activo' : ''}"${activo ? ' aria-current="page"' : ''}>${texto}</a>`;
}).join('');

document.body.insertAdjacentHTML('beforeend', `
  <div class="velo" id="erOverlay"></div>

  <aside class="menu-lateral" id="erMenu" role="dialog" aria-modal="true" aria-label="Menú de navegación" aria-hidden="true">
    <div class="menu-lateral__cabecera">
      <img class="menu-lateral__logo" src="img/erebus-logo.png" alt="Erebus Cosmetics">
      <button type="button" class="menu-lateral__cerrar" data-cerrar id="erCerrarMenu" aria-label="Cerrar menú">&times;</button>
    </div>
    <nav class="menu-lateral__nav" aria-label="Principal">${enlacesMenu}</nav>
    <p class="menu-lateral__pie">Tu aliado mayorista en maquillaje y belleza</p>
  </aside>

  <aside class="carrito" id="erCarrito" role="dialog" aria-modal="true" aria-label="Carrito de compras" aria-hidden="true">
    <button type="button" class="carrito__cerrar" data-cerrar id="erCerrarCarrito" aria-label="Cerrar carrito">
      <img src="img/x.svg" alt="">
    </button>
    <h2 class="carrito__titulo">CARRITO</h2>
    <ul class="carrito__lista" id="erLista"></ul>
    <div class="carrito__pie">
      <p class="carrito__total"><span>Total</span><strong id="erTotal">$0 COP</strong></p>
      <button type="button" class="carrito__vaciar" id="erVaciar">Vaciar carrito</button>
    </div>
  </aside>

  <div class="aviso" id="erAviso" role="status" aria-live="polite"></div>
`);

const velo = document.getElementById('erOverlay');
const menu = document.getElementById('erMenu');
const panelCarrito = document.getElementById('erCarrito');
const lista = document.getElementById('erLista');
const totalEl = document.getElementById('erTotal');
const btnVaciar = document.getElementById('erVaciar');
const aviso = document.getElementById('erAviso');

let panelAbierto = null;
let disparador = null;

const abrirPanel = (panel, origen = null) => {
  cerrarPanel(true);
  const [claseBase] = panel.classList;
  panelAbierto = panel;
  disparador = origen;
  if (panel === panelCarrito) {
    const alto = navbar ? navbar.offsetHeight : 0;
    document.documentElement.style.setProperty('--navbar-alto', `${alto}px`);
  }
  panel.classList.add(`${claseBase}--abierto`);
  panel.setAttribute('aria-hidden', 'false');
  velo.classList.add('velo--visible');
  document.body.classList.add('pagina--bloqueada');
  panel.querySelector('[data-cerrar]').focus();
};

const cerrarPanel = (sinFoco = false) => {
  if (!panelAbierto) return;
  const [claseBase] = panelAbierto.classList;
  panelAbierto.classList.remove(`${claseBase}--abierto`);
  panelAbierto.setAttribute('aria-hidden', 'true');
  velo.classList.remove('velo--visible');
  document.body.classList.remove('pagina--bloqueada');
  panelAbierto = null;
  if (!sinFoco && disparador) disparador.focus();
};

if (btnMenu) btnMenu.addEventListener('click', () => abrirPanel(menu, btnMenu));
if (btnCarrito) {
  btnCarrito.addEventListener('click', (evento) => {
    evento.preventDefault();
    abrirPanel(panelCarrito, btnCarrito);
  });
}
document.getElementById('erCerrarMenu').addEventListener('click', () => cerrarPanel());
document.getElementById('erCerrarCarrito').addEventListener('click', () => cerrarPanel());
velo.addEventListener('click', () => cerrarPanel());
document.addEventListener('keydown', ({ key }) => {
  if (key === 'Escape') cerrarPanel();
});

const crearFila = ({ id, nombre, precio, imagen, cantidad }) => {
  const fila = crearElemento('li', 'carrito__articulo');
  fila.dataset.id = id;

  const foto = crearElemento('img', 'carrito__imagen');
  foto.src = imagen;
  foto.alt = nombre;

    const controles = crearElemento(
    'div',
    'carrito__cantidad',
    crearBoton('carrito__cantidad-btn', 'menos', '−', `Quitar una unidad de ${nombre}`),
    crearElemento('span', 'carrito__cantidad-valor', cantidad),
    crearBoton('carrito__cantidad-btn', 'mas', '+', `Agregar una unidad de ${nombre}`)
  );

  const iconoQuitar = crearElemento('img');
  iconoQuitar.src = 'img/x.svg';
  iconoQuitar.alt = '';
  const quitar = crearBoton('carrito__eliminar', 'quitar', '', `Eliminar ${nombre}`);
  quitar.append(iconoQuitar);

  fila.append(
    foto,
    crearElemento('p', 'carrito__precio', formatearPrecio(precio)),
    crearElemento('p', 'carrito__nombre', nombre),
    controles,
    quitar
  );
  return fila;
};

const pintarCarrito = () => {
  const cantidad = carrito.cantidadTotal();

  if (insignia) {
    insignia.textContent = cantidad > 99 ? '99+' : cantidad;
    insignia.hidden = cantidad === 0;
  }
  if (btnCarrito) {
    btnCarrito.setAttribute('aria-label', `Ver carrito, ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`);
  }

  lista.innerHTML = '';
  if (carrito.productos.length === 0) {
    lista.append(crearElemento('li', 'carrito__vacio',
      'Tu carrito está vacío.',
      document.createElement('br'),
      'Agrega productos con el botón “Agregar al carrito”.'));
  } else {
    const fragmento = document.createDocumentFragment();
    for (const producto of carrito.productos) {
      fragmento.append(crearFila(producto));
    }
    lista.append(fragmento);
  }

  totalEl.textContent = formatearPrecio(carrito.precioTotal());
  btnVaciar.disabled = carrito.productos.length === 0;
};

lista.addEventListener('click', (evento) => {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton) return;
  const { id } = boton.closest('.carrito__articulo').dataset;

  switch (boton.dataset.accion) {
    case 'mas':
      carrito.cambiarCantidad(id, 1);
      break;
    case 'menos':
      carrito.cambiarCantidad(id, -1);
      break;
    case 'quitar':
      carrito.quitar(id);
      break;
  }
  pintarCarrito();
});

btnVaciar.addEventListener('click', () => {
  carrito.vaciar();
  pintarCarrito();
});

let temporizadorAviso;
const mostrarAviso = (texto) => {
  aviso.textContent = texto;
  aviso.classList.add('aviso--visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove('aviso--visible'), 2200);
};

const animarInsignia = () => {
  if (!insignia) return;
  insignia.classList.remove('navbar-erebus__badge--salto');
  void insignia.offsetWidth; 
  insignia.classList.add('navbar-erebus__badge--salto');
};

const confirmarBoton = (boton) => {
  const [claseBase] = boton.classList; 
  if (!boton.dataset.texto) boton.dataset.texto = boton.textContent;
  boton.textContent = '¡Agregado!';
  boton.classList.add(`${claseBase}--agregado`);
  clearTimeout(boton.temporizador);
  boton.temporizador = setTimeout(() => {
    boton.textContent = boton.dataset.texto;
    boton.classList.remove(`${claseBase}--agregado`);
  }, 1200);
};

document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('.js-agregar');
  if (!boton) return;
  const { id, nombre, precio, imagen } = boton.dataset;
  carrito.agregar({ id, nombre, precio: Number(precio), imagen });
  pintarCarrito();
  animarInsignia();
  mostrarAviso(`${nombre} se agregó al carrito`);
  confirmarBoton(boton);
});

window.addEventListener('storage', ({ key }) => {
  if (key === CLAVE_CARRITO) {
    carrito.productos = carrito.cargar();
    pintarCarrito();
  }
});

const formularioBusqueda = document.querySelector('.navbar-erebus__buscador');
const tarjetas = document.querySelectorAll('.catalogo__tarjeta');

if (formularioBusqueda) {
  const campo = formularioBusqueda.querySelector('input[type="search"]');
  const hayCatalogo = tarjetas.length > 0;
  let sinResultados = null;

  if (hayCatalogo) {
    sinResultados = crearElemento('p', 'catalogo__sin-resultados', 'No encontramos productos con ese nombre.');
    sinResultados.hidden = true;
    tarjetas[0].parentElement.append(sinResultados);
  }

  const filtrar = () => {
    const busqueda = limpiarTexto(campo.value.trim());
    let visibles = 0;
    for (const tarjeta of tarjetas) {
      const nombre = limpiarTexto(tarjeta.querySelector('.catalogo__nombre').textContent);
      const coincide = nombre.includes(busqueda);
      tarjeta.classList.toggle('catalogo__tarjeta--oculta', !coincide);
      if (coincide) visibles++;
    }
    sinResultados.hidden = visibles > 0;
  };

  campo.addEventListener('input', () => {
    if (hayCatalogo) filtrar();
  });

  formularioBusqueda.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (hayCatalogo) {
      filtrar();
    } else {
      
      const busqueda = campo.value.trim();
      location.href = busqueda ? `maquillaje.html?buscar=${encodeURIComponent(busqueda)}` : 'maquillaje.html';
    }
  });

  const consulta = new URLSearchParams(location.search).get('buscar');
  if (consulta && hayCatalogo) {
    campo.value = consulta;
    filtrar();
  }
}

const SCROLL_COMPACTA = 60; 
const SCROLL_COMPLETA = 20;

const actualizarNavbar = () => {
  if (!navbar) return;
  const compacta = navbar.classList.contains('navbar-erebus--compacta');
  if (!compacta && window.scrollY > SCROLL_COMPACTA) {
    navbar.classList.add('navbar-erebus--compacta');
  } else if (compacta && window.scrollY < SCROLL_COMPLETA) {
    navbar.classList.remove('navbar-erebus--compacta');
  }
};

window.addEventListener('scroll', actualizarNavbar, { passive: true });
actualizarNavbar();

pintarCarrito();
