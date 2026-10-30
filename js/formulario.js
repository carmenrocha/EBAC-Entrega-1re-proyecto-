'use strict';

(() => {
  const formulario = document.querySelector('.formulario-contacto__form');
  if (!formulario) return;

  const MAX_MENSAJE = 500;


  const REGLAS = {
    nombre: {
      obligatorio: true,
      validar: (valor) => valor.length >= 3 || 'Escribe tu nombre completo (mínimo 3 letras).'
    },
    email: {
      obligatorio: true,
      validar: (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor) || 'Escribe un correo válido, por ejemplo tu@correo.com.'
    },
    telefono: {
      obligatorio: false,
      validar: (valor) => /^\d{7,10}$/.test(valor.replace(/[\s-]/g, '')) || 'El teléfono debe tener entre 7 y 10 dígitos.'
    },
    asunto: {
      obligatorio: true,
      validar: () => true
    },
    mensaje: {
      obligatorio: true,
      validar: (valor) => valor.length >= 10 || 'Cuéntanos un poco más (mínimo 10 caracteres).'
    }
  };

  const crearElemento = (etiqueta, clase = '', ...contenido) => {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    elemento.append(...contenido);
    return elemento;
  };

  const obtenerError = (campo) => {
    const regla = REGLAS[campo.name];
    const valor = campo.value.trim();
    if (valor === '') return regla.obligatorio ? 'Este campo es obligatorio.' : '';
    const resultado = regla.validar(valor);
    return resultado === true ? '' : resultado;
  };


  const mensajesError = {};
  for (const nombre in REGLAS) {
    const campo = formulario.elements[nombre];
    const mensaje = crearElemento('p', 'formulario-contacto__error');
    mensaje.id = `error-${nombre}`;
    mensaje.hidden = true;
    campo.setAttribute('aria-describedby', mensaje.id);
    campo.after(mensaje);
    mensajesError[nombre] = mensaje;
  }

  const campoMensaje = formulario.elements.mensaje;
  campoMensaje.maxLength = MAX_MENSAJE;
  const contador = crearElemento('span', 'formulario-contacto__contador', `0 / ${MAX_MENSAJE}`);
  campoMensaje.after(contador);

  const estado = crearElemento('p', 'formulario-contacto__estado');
  estado.setAttribute('role', 'status');
  estado.hidden = true;
  formulario.querySelector('.formulario-contacto__enviar').after(estado);

  const marcarCampo = (campo) => {
    const error = obtenerError(campo);
    const [claseBase] = campo.classList; 
    const hayError = error !== '';

    campo.classList.toggle(`${claseBase}--invalido`, hayError);
    campo.classList.toggle(`${claseBase}--valido`, !hayError && campo.value.trim() !== '');
    campo.setAttribute('aria-invalid', String(hayError));
    mensajesError[campo.name].textContent = error;
    mensajesError[campo.name].hidden = !hayError;
    return !hayError;
  };

  const mostrarEstado = (tipo, texto) => {
    estado.className = `formulario-contacto__estado formulario-contacto__estado--${tipo}`;
    estado.textContent = texto;
    estado.hidden = false;
  };

  const actualizarContador = () => {
    const largo = campoMensaje.value.length;
    contador.textContent = `${largo} / ${MAX_MENSAJE}`;
    contador.classList.toggle('formulario-contacto__contador--limite', largo >= MAX_MENSAJE);
  };

  const limpiarFormulario = () => {
    formulario.reset();
    for (const nombre of Object.keys(REGLAS)) {
      const campo = formulario.elements[nombre];
      const [claseBase] = campo.classList;
      campo.classList.remove(`${claseBase}--invalido`, `${claseBase}--valido`);
      campo.removeAttribute('aria-invalid');
      delete campo.dataset.tocado;
      mensajesError[nombre].hidden = true;
    }
    actualizarContador();
  };

 
  formulario.addEventListener('focusout', ({ target }) => {
    if (!(target.name in REGLAS)) return;
    target.dataset.tocado = 'si';
    marcarCampo(target);
  });


  formulario.addEventListener('input', ({ target }) => {
    if (!(target.name in REGLAS)) return;
    if (target.dataset.tocado) marcarCampo(target);
    if (target === campoMensaje) actualizarContador();
    estado.hidden = true;
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const conError = Object.keys(REGLAS).filter((nombre) => {
      const campo = formulario.elements[nombre];
      campo.dataset.tocado = 'si';
      return !marcarCampo(campo);
    });

    if (conError.length > 0) {
      mostrarEstado('error', `Revisa ${conError.length === 1 ? 'el campo marcado' : `los ${conError.length} campos marcados`} en rojo.`);
      formulario.elements[conError[0]].focus();
      return;
    }

    const [primerNombre] = formulario.elements.nombre.value.trim().split(' ');
    limpiarFormulario();
    mostrarEstado('exito', `¡Gracias, ${primerNombre}! Tu mensaje se validó correctamente. Este formulario es una demostración y aún no envía los datos.`);
  });
})();
