-- Dropando todas as tabelas e sequences
DROP TABLE BETS;
DROP TABLE WALLET;
DROP TABLE EVENTS;
DROP TABLE ACCOUNTS;

DROP SEQUENCE SEQ_ACCOUNTS;
DROP SEQUENCE SEQ_EVENTS;
DROP SEQUENCE SEQ_BALANCE;
DROP SEQUENCE SEQ_BETS;

-- Criando as tabelas
CREATE TABLE ACCOUNTS (
    CPF NUMBER NOT NULL PRIMARY KEY,
    COMPLETE_NAME VARCHAR2(500) NOT NULL,
    EMAIL VARCHAR2(500) NOT NULL UNIQUE,
    PASSWORD VARCHAR2(64) NOT NULL,
    PHONE_NUMBER NUMBER NOT NULL,
    BIRTHDATE DATE NOT NULL,
    TOKEN VARCHAR2(32) NULL UNIQUE,
    ROLE NUMBER(1) NOT NULL,
    CREATED_AT DATE DEFAULT SYSDATE
);



CREATE TABLE WALLET (
    ID NUMBER NOT NULL PRIMARY KEY,
    BALANCE NUMBER NOT NULL,
    CPF NUMBER NOT NULL UNIQUE,
    FOREIGN KEY (CPF) REFERENCES ACCOUNTS(CPF)
);

CREATE TABLE EVENTS (
    ID NUMBER NOT NULL PRIMARY KEY,
    NAME VARCHAR2(500) NOT NULL,
    CATEGORY VARCHAR2(50) NOT NULL,
    FEE NUMBER NOT NULL,
    START_DATE DATE NOT NULL,
    END_DATE DATE NOT NULL,
    APPROVED NUMBER(1) NOT NULL,
    STATUS_EVENT NUMBER(1) NOT NULL
);

CREATE TABLE BETS (
    ID NUMBER NOT NULL PRIMARY KEY,
    BET_VALUE NUMBER NOT NULL,
    CHOICE NUMBER(1) NOT NULL,
    BET_AT DATE DEFAULT SYSDATE,
    CPF NUMBER NOT NULL,
    ID_EVENTS NUMBER NOT NULL,
    FOREIGN KEY (CPF) REFERENCES ACCOUNTS(CPF),
    FOREIGN KEY (ID_EVENTS) REFERENCES EVENTS(ID)
);

-- Criando as sequences
CREATE SEQUENCE SEQ_ACCOUNTS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_EVENTS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_BALANCE START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_BETS START WITH 1 INCREMENT BY 1;

-- Commitando as alterações
COMMIT;