USE Equilibrio;

show tables;

-- traer todos los Usuarios
select
    *
from
    Usuario;

-- traer todas las monedas
select
    *
from
    Moneda;

-- traer todas las cuentas
select
    *
from
    Cuenta;

-- traer todas las categorias
select
    *
from
    Categoria;

-- traer todos los movimientos
select
    *
from
    Movimiento;

-- traer todos los gastos
select
    *
from
    Gasto;

-- traer todos los ingresos
select
    *
from
    Ingreso;

-- actualizar el campo Formulario a falso para el usuario con IdUsuario = 3
update Usuario
set
    Formulario = '0'
where
    IdUsuario = 3;

-- traer todos los gastos con el nombre de la cuenta y categoria para el usuario con IdUsuario = 3
select
    g.IdGasto,
    g.Valor,
    g.FechaGasto,
    g.Descripcion,
    c.Nombre As NombreCuenta,
    ca.Nombre As NombreCategoria,
    g.UsuarioId
from
    Gasto As g
    inner join Cuenta As c on g.CuentaId = c.IdCuenta
    inner join Categoria As ca on g.CategoriaId = ca.IdCategoria
where
    g.UsuarioId = 3;

-- insertar una moneda
INSERT INTO
    Moneda (Nombre, PrecioDolar)
VALUES
    ('PESO COLOMBIANO', 0.00026);

select
    m.IdMovimiento,
    m.Valor,
    m.FechaMovimiento,
    m.Tipo,
    c.Nombre As NombreCuenta,
    m.UsuarioId
from
    Movimiento As m
    inner join Cuenta As c on m.CuentaId = c.IdCuenta
where
    m.UsuarioId = 3;

select
    i.IdIngreso,
    i.Valor,
    i.FechaIngreso,
    c.Nombre As NombreCuenta,
    i.UsuarioId
from
    Ingreso As i
    inner join Cuenta As c on i.CuentaId = c.IdCuenta
where
    i.UsuarioId = 3;