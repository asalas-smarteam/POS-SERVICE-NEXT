// Techo de productos por render del menu: una sede real no tiene miles de
// productos en sus categorias publicadas, pero nada impide que las tenga. Sin
// un limite, un menu patologico deja que cualquier visitante anonimo pague
// (con tiempo de render y transferencia) una consulta arbitrariamente grande.
// Vive aparte porque lo usan la pagina publica y el endpoint de vista previa,
// y dos copias del mismo numero terminan divergiendo.
export const MAX_MENU_PRODUCTS = 500;
