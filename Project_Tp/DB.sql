-- este es el manual ionstalacion mysql ubuntu serv

sudo apt update && sudo apt upgrade -y

sudo apt install mysql-server -y

sudo systemctl start mysql
sudo systemctl enable mysql

sudo mysql_secure_installation

sudo systemctl status mysql

sudo mysql -u root -p

CREATE USER 'juan'@'%' IDENTIFIED BY 'M4n24n4.,';
GRANT ALL PRIVILEGES ON *.* TO 'juan'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

mysql -h 192.168.0.37 -u juan -p


-- base de datos
CREATE DATABASE chat_app;

 

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE mensajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

INSERT INTO usuarios (username, password_hash)
VALUES ('admin', 'M4n24n4.,');

INSERT INTO usuarios (username, password_hash)
VALUES ('adrian', 'adrian123');

INSERT INTO usuarios (username, password_hash)
VALUES ('juan', 'juan123');

INSERT INTO usuarios (username, password_hash)
VALUES ('cristian', 'cristian123');