// Configuración de Firebase
const firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-auth-domain",
    projectId: "tu-project-id",
    storageBucket: "tu-storage-bucket",
    messagingSenderId: "tu-messaging-sender-id",
    appId: "tu-app-id"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app); // Accede a Firestore

let productos = {};
let bitacora = [];
const usuarios = {
    maestro: 'maestro123',
    vendedor: 'vendedor123'
};

function login() {
    const usuario = document.getElementById("username").value;
    const contrasena = document.getElementById("password").value;

    if (usuarios[usuario] && usuarios[usuario] === contrasena) {
        document.getElementById("login").style.display = "none";
        document.getElementById("menu").style.display = "block";
        setupMenu(usuario);
    } else {
        alert("Usuario o contraseña no válidos");
    }
}

function setupMenu(usuario) {
    const menuButtons = document.getElementById("menuButtons");
    menuButtons.innerHTML = "";

    if (usuario === 'maestro') {
        menuButtons.innerHTML += `
            <button onclick="showSection('addProduct')">AGREGAR PRODUCTO</button>
            <button onclick="showSection('saleProduct')">VENTA DE PRODUCTO</button>
            <button onclick="showSection('showStock')">MOSTRAR EXISTENCIAS</button>
            <button onclick="showSection('showKardex')">KARDEX DE PRODUCTO</button>
            <button onclick="showSection('addInventory')">INGRESO DE INVENTARIO</button>
        `;
    }

    if (usuario === 'vendedor') {
        menuButtons.innerHTML += `
            <button onclick="showSection('saleProduct')">VENTA DE PRODUCTO</button>
            <button onclick="showSection('showStock')">MOSTRAR EXISTENCIAS</button>
        `;
    }

    menuButtons.innerHTML += `
        <button onclick="logout()">CERRAR SESIÓN</button>
    `;
}

function showSection(sectionId) {
    hideAllSections();
    document.getElementById(sectionId).style.display = "block";
    if (sectionId === 'saleProduct') {
        populateSaleDropdown();
    }
}

function hideAllSections() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("addProduct").style.display = "none";
    document.getElementById("saleProduct").style.display = "none";
    document.getElementById("showStock").style.display = "none";
    document.getElementById("showKardex").style.display = "none";
    document.getElementById("addInventory").style.display = "none";
    document.getElementById("login").style.display = "none";
}

function clearAddProduct() {
    document.getElementById("productCode").value = "";
    document.getElementById("productName").value = "";
    document.getElementById("productQuantity").value = "";
    document.getElementById("productCost").value = "";
    document.getElementById("productPriceCash").value = "";
    document.getElementById("productPriceCredit").value = "";
    hidePreview();
}

function previewProduct() {
    const codigo = document.getElementById("productCode").value;
    const nombre = document.getElementById("productName").value;
    const costo = parseFloat(document.getElementById("productCost").value);
    const precioContado = parseFloat(document.getElementById("productPriceCash").value);
    const precioCredito = parseFloat(document.getElementById("productPriceCredit").value);
    const cantidad = parseInt(document.getElementById("productQuantity").value);

    if (productos[codigo]) {
        alert("El código de producto ya existe.");
        return;
    }

    const total = cantidad * costo;
    const previewDetails = `
        <strong>CÓDIGO:</strong> ${codigo}<br>
        <strong>NOMBRE:</strong> ${nombre}<br>
        <strong>CANTIDAD:</strong> ${cantidad}<br>
        <strong>COSTO:</strong> Q${costo.toFixed(2)}<br>
        <strong>PRECIO CONTADO:</strong> Q${precioContado.toFixed(2)}<br>
        <strong>PRECIO CRÉDITO:</strong> Q${precioCredito.toFixed(2)}<br>
        <strong>TOTAL:</strong> Q${total.toFixed(2)}
    `;
    document.getElementById("previewDetails").innerHTML = previewDetails;
    document.getElementById("previewSection").style.display = "block"; 
}

function confirmAddProduct() {
    const productCode = document.getElementById("productCode").value;
    const productName = document.getElementById("productName").value;
    const productQuantity = parseInt(document.getElementById("productQuantity").value);
    const productCost = parseFloat(document.getElementById("productCost").value);
    const productPriceCash = parseFloat(document.getElementById("productPriceCash").value);
    const productPriceCredit = parseFloat(document.getElementById("productPriceCredit").value);

    // Validaciones previas
    if (!productCode || !productName || isNaN(productQuantity) || isNaN(productCost) || isNaN(productPriceCash) || isNaN(productPriceCredit)) {
        alert("Por favor, complete todos los campos correctamente.");
        return;
    }

    // Verificar si el producto ya existe en Firestore
    db.collection("productos").where("codigo", "==", productCode).get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                alert("El código de producto ya existe.");
                return;
            }

            // Agregar el producto a Firestore
            db.collection("productos").add({
                codigo: productCode,
                nombre: productName,
                cantidad: productQuantity,
                costo: productCost,
                precioContado: productPriceCash,
                precioCredito: productPriceCredit
            })
            .then((docRef) => {
                console.log("Producto guardado con ID: ", docRef.id);

                // Actualizar el objeto productos en memoria
                productos[productCode] = {
                    nombre: productName,
                    costo: productCost,
                    precioContado: productPriceCash,
                    precioCredito: productPriceCredit,
                    existencia: productQuantity
                };

                // Registrar en la bitácora
                bitacora.push({
                    tipo: "Ingreso",
                    codigo: productCode,
                    nombre: productName,
                    cantidad: productQuantity,
                    fecha: new Date().toLocaleString()
                });

                alert("Producto agregado con éxito.");
                clearAddProduct();  // Limpiar los campos de entrada
            })
            .catch((error) => {
                console.error("Error al agregar el producto: ", error);
                alert("Hubo un error al agregar el producto.");
            });
        })
        .catch((error) => {
            console.error("Error al verificar el código: ", error);
            alert("Hubo un error al verificar el producto.");
        });
}

function hidePreview() {
    document.getElementById("previewSection").style.display = "none";
}

function logout() {
    document.getElementById("login").style.display = "block";
    document.getElementById("menu").style.display = "none";
    productos = {};
    bitacora = [];
}

// Función para mostrar las existencias de productos
function showStock() {
    const stockList = document.getElementById("stockList");
    stockList.innerHTML = ""; // Limpiar la lista antes de agregar los productos

    db.collection("productos").get()
    .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const product = doc.data();

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${product.codigo}</td>
                <td>${product.nombre}</td>
                <td>${product.cantidad}</td>
                <td>${product.precioContado}</td>
                <td>${product.precioCredito}</td>
            `;
            stockList.appendChild(row);
        });
    })
    .catch((error) => {
        console.error("Error al obtener los productos: ", error);
        alert("Hubo un error al obtener los productos.");
    });
}
