use restaurante;

select * from usuarios;
select * from mesas;
select * from pedidos;
select * from detalle_pedidos;
select * from productos;
select * from pagos;

INSERT INTO mesas (numero, estado, created_at, updated_at) VALUES
('1','libre',NOW(),NOW()),
('2','libre',NOW(),NOW()),
('3','libre',NOW(),NOW()),
('4','libre',NOW(),NOW()),
('5','libre',NOW(),NOW()),
('6','libre',NOW(),NOW()),
('7','libre',NOW(),NOW()),
('8','libre',NOW(),NOW()),
('9','libre',NOW(),NOW()),
('10','libre',NOW(),NOW()),
('11','libre',NOW(),NOW()),
('12','libre',NOW(),NOW()),
('13','libre',NOW(),NOW()),
('14','libre',NOW(),NOW()),
('15','libre',NOW(),NOW()),
('16','libre',NOW(),NOW()),
('17','libre',NOW(),NOW()),
('18','libre',NOW(),NOW()),
('19','libre',NOW(),NOW()),
('20','libre',NOW(),NOW()),
('21','libre',NOW(),NOW()),
('22','libre',NOW(),NOW()),
('23','libre',NOW(),NOW()),
('24','libre',NOW(),NOW()),
('25','libre',NOW(),NOW()),
('26','libre',NOW(),NOW()),
('27','libre',NOW(),NOW()),
('28','libre',NOW(),NOW()),
('29','libre',NOW(),NOW()),
('30','libre',NOW(),NOW()),
('31','libre',NOW(),NOW()),
('32','libre',NOW(),NOW()),
('33','libre',NOW(),NOW()),
('34','libre',NOW(),NOW()),
('35','libre',NOW(),NOW()),
('36','libre',NOW(),NOW()),
('Domicilio','libre',NOW(),NOW()),
('Mostrador','libre',NOW(),NOW());



INSERT INTO productos (nombre, precio, categoria, descripcion, created_at, updated_at) VALUES
('Menú Ejecutivo',16000,'ejecutivo','Sopa, principio, arroz, carne, ensalada, tajada, jugo',NOW(),NOW()),

('Bandeja Paisa',28000,'carta','Frijoles, arroz, chicharrón, chorizo, carne molida, huevo, tajada, aguacate',NOW(),NOW()),
('Cazuela de Frijoles',24000,'carta','Frijoles, arroz, plátano, chicharrón, chorizo, huevo',NOW(),NOW()),
('Mojarra Frita',28000,'carta','Sopa, principio, arroz, ensalada',NOW(),NOW()),
('Trucha Asada',28000,'carta','Sopa, principio, arroz, ensalada',NOW(),NOW()),
('Trucha Gratinada',29000,'carta','Sopa, principio, arroz, ensalada',NOW(),NOW()),
('Chuleta',20000,'carta','Cerdo, pollo o pescado, sopa, arroz, tajada, ensalada',NOW(),NOW()),
('Mondongo',18000,'carta','Arroz, banano, ensalada, jugo',NOW(),NOW()),
('Sancocho',18000,'carta','Arroz, banano, ensalada, jugo',NOW(),NOW()),
('Ajiaco',18000,'carta','Arroz, banano, ensalada, jugo',NOW(),NOW()),
('Tamales',16000,'carta','Bebida adicional',NOW(),NOW()),

('Filete de Pechuga',21000,'asados','Papas fritas, arepa, ensalada',NOW(),NOW()),
('Churrasco',28000,'asados','Papas fritas, arepa, ensalada',NOW(),NOW()),
('Costillas BBQ',24000,'asados','Chorizo, papas fritas, arepa, ensalada',NOW(),NOW()),
('Asada de Cerdo',20000,'asados','Papas fritas, arepa, ensalada',NOW(),NOW()),
('Combo con Chorizo',22000,'asados','Carne asada o pechuga, chorizo, papas fritas, arepa, ensalada',NOW(),NOW()),
('Plato de Chorizos',15000,'asados','2 chorizos, papas fritas, arepa, ensalada',NOW(),NOW()),
('Picada',24000,'asados','Carne asada, chicharrón, chorizo, papas fritas, plátano maduro, ensalada, arepa',NOW(),NOW()),

('Caldo de Costilla',14000,'desayuno','Costilla, albóndigas, pollo o pescado, arroz, arepa, chocolate',NOW(),NOW()),
('Calentado',14000,'desayuno','Carne asada, chicharrón, chorizo o huevos, arepa, queso, chocolate',NOW(),NOW()),
('Migas con Queso',11000,'desayuno','Migas, queso, chocolate',NOW(),NOW()),
('Desayuno de la Casa',15000,'desayuno','Carne molida, huevos pericos, arroz, arepa, queso, chocolate',NOW(),NOW()),
('Huevos al Gusto',11000,'desayuno','Arroz, arepa, queso, chocolate',NOW(),NOW()),

('Jugo en Agua',6000,'bebida','Jugo natural en agua',NOW(),NOW()),
('Jugo en Leche',7000,'bebida','Jugo natural en leche',NOW(),NOW()),
('Gaseosa Personal',4000,'bebida','Gaseosa 400 ml',NOW(),NOW()),
('Gaseosa 1.5L',7000,'bebida','Gaseosa 1.5 litros',NOW(),NOW()),
('Coca-Cola 1.5L',8000,'bebida','Coca-Cola 1.5 litros',NOW(),NOW()),
('Botella con agua',2500,'bebida','botella con agua',NOW(),NOW()),
('Gatorade',4500,'bebida','Gatorade',NOW(),NOW()),
('Pony Malta',3500,'bebida','Pony Malta',NOW(),NOW()),
('SpeedMax',2000,'bebida','SpeedMax',NOW(),NOW()),
('Bretaña',4000,'bebida','Bretaña',NOW(),NOW()),
('Hidralyte',5000,'bebida','Hidralyte',NOW(),NOW()),
('Vive100',3000,'bebida','Vive100',NOW(),NOW()),
('Amper',4000,'bebida','Amper',NOW(),NOW()),
('Sabiloe',3000,'bebida','Sabiloe',NOW(),NOW()),
('Cerveza',5000,'bebida','Cerveza nacional',NOW(),NOW()),

('Sopa',7000,'otros','Sopa del dia',NOW(),NOW()),
('Carne',5000,'otros','Porcion de carne',NOW(),NOW()),
('Porcion Arroz',4000,'otros','Arroz',NOW(),NOW()),
('Porcion Francesa',5000,'otros','Francesa',NOW(),NOW()),
('Empanada',2000,'otros','empanada',NOW(),NOW()),
('Chocolate',3000,'otros','chocolate',NOW(),NOW()),
('Cafe',1700,'otros','editar precio dependiendo',NOW(),NOW()),
('Icopor',2000,'otros','icopor',NOW(),NOW()),
('Domicilio',0,'otros',' ',NOW(),NOW()),
('Productos Varios',0,'otros',' ',NOW(),NOW());


