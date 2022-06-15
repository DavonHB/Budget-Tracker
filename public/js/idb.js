const { response } = require("express");
const { get } = require("mongoose");

// create a variable to hold db connection
let db;

// establish connection to INdexedDB called 'budget_tracker' and set it to version 1
const request = indexedDB.open('budget_tracker', 1);

// if version changes, event emits
request.onupgradeneeded = function(event) {
    //save a reference to db
    const db = event.target.result;
    // create an object store called 'new_transaction' and set it to have an auto increment primary key
    db.createObjectStore('new_transaction', { autoIncrement: true } );
};

// upon success
request.onsuccess = function(event) {
    //when db is successfully created with its object store/established connection. save to db in global variable
    db = event.target.result;
    // check if app is online, run uploadTransaction() if yes
    if (navigator.onLine) {
        uploadTransaction()
    }
};

request.onerror = function(event) {
    // log error
    console.log(event.target.errorCode);
};

// execute if user attempts to submit a new transaction and theres no internet connection
function saveRecord(record) {
    // open a new transaction with db with read/write permissions
    const transaction = db.transaction(['new_transaction'], 'readWrite');
    // access object store for 'new_transaction'
    const budgetObjectStore = transaction.objectStore('new_transaction');
    // add record to store
    budgetObjectStore.add(record);
}

function uploadTransaction() {
    // open transaction in db
    const transaction = db.transaction(['new_transaction'], 'readWrite');
    // access object store
    const budgetObjectStore = transaction.objectStore('new_transaction');
    // get all records from store and set to a variable
    const getAll = budgetObjectStore.getAll();

    getAll.onsuccess = function() {
        // if data is in db store, send to api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(serverResponse => {
                if (serverResponse.message) {
                    throw new Error(serverResponse);
                }

                // open one more transaction
                const transaction = db.transaction(['new_transaction'], 'readWrite');
                // access new_transaction object store
                const budgetObjectStore = transaction.objectStore('new_transaction');
                // clear items in store
                budgetObjectStore.clear();

                alert('All saved transactions were submitted');
            })
            .catch(err => {
                console.log(err);
            });
        }
    }
};

// listen for app coming back online
window.addEventListener('online', uploadTransaction);