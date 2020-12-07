const express = require("express");

const admin = require("firebase-admin");
const serviceAccount = require("./../serviceAccount.json"); // "./" per importare un file

const router = express.Router();

const users = [];

// inizializzo l'app al progetto firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// importo il DB
const db = admin.firestore();

// function genId(users){
//     // Ternario -> ? - if ; : - else
//     return users.length > 0 ? Math.max(...users.map(user => user.id)) + 1 : 1;
// }

function genId(users) {
    return users.length > 0 ? Math.max(...users.map(user => user.id)) + 1 : 1;
}

// Aggiorna lista
async function washMachine() {
    users.length = 0;
    const list = await db.collection("users").get();
    list.forEach(doc => users.push(doc.data()));
}

// GET (1 e 2)
// funzione asincrona
router.get("/users", async (req, res) => {
    try{
        await washMachine();
        return res.json(users);
    } catch (error){
        return res.status(500).send(error);
    }
});

router.get("/users/:id", (req,res) => {
    db.collection("users").doc(req.params.id).get().then(
        // equivalente a un forEach
        user => {
            if(!user.exists){
                res.status(404).json({message: "User not found :("});
            }
            res.status(200).json(user.data());
        }
    ).catch(error => res.status(500).send(error));
});

//POST 
router.post("/users", async (req, res) => {
    try {
        // aspetto il DB per evitare che si creino elementi con il medesimo id
        await washMachine();
        const newId = genId(users);
        let user = {
            id: newId,
            name: req.body.name
        };
        users.push(user);
        db.collection("users").doc(newId.toString()).set(user);
        return res.status(201).json({ message: "Created"});
    } catch (error) {
        return res.status(500).send(error);
    }
});

//UPDATE (patch)
router.patch("/users/:id", async (req,res) => {
    try {
        // Aggiorno la lista
        await washMachine();

        if (!req.body.name){
            return res.status(400).json({message: "You have to pass a name :/"});
        }
        const u = await db.collection("users").doc(req.params.id).get();
        if (!u.data()){
            return res.status(404).json({message: "User not found :("});
        }

        // In remoto
        db.collection("users").doc(req.params.id).set({name: req.body.name}, {merge: true});
        // In locale
        const user = users.find(valore => valore.id === Number(req.params.id));
        user.name = req.body.name;
        return res.json({message: "Updated"});
    } catch (error) {
        return res.status(500).send(error);
    }
});

// DELETE
router.delete("/users/:id", async (req,res) => {
    try {
        // Aggiorno la lista
        await washMachine();

        const u = await db.collection("users").doc(req.params.id).get();
        if (!u.data()){
            return res.status(404).json({message: "User not found :("});
        }

        db.collection("users").doc(req.params.id).delete()
        const userIndex = users.findIndex(valore => valore.id === Number(req.params.id));
        users.splice(userIndex, 1);
        return res.json({message: "Deleted"});
    } catch (error) {
        return res.status(500).send(error);
    }
})

// Esporto le funzionalità agli altri file
module.exports = router;