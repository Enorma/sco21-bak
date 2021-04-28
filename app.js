const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const bcrypt     = require("bcrypt");
const jwt        = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const AdminModel   = require("./models/AdminModel");
const AlumnoModel  = require("./models/AlumnoModel");
const TeacherModel = require("./models/TeacherModel");
const GrupoModel   = require("./models/GrupoModel");

const app = express();

//const port   = process.env.PORT || 3000;
const port   = 3000;
const mpass  = process.env.MONGOPASS || "passejemplo";
const jwtKey = process.env.JWT || "passejemplo";

const mconnstr = `mongodb://127.0.0.1:27017/sco21?readPreference=primary&appname=MongoDB%20Compass&ssl=false`;
const mconfig = {
    "useNewUrlParser"    : true,
    "useUnifiedTopology" : true,
    "useCreateIndex"     : true,
};
mongoose.connect(mconnstr, mconfig)
    .then(() => {
        console.log("connection to mongo OK.\n");
    }, error => {
        console.error("connection to mongo failed:", error);
    })
    .catch(error => {
        console.error("connection to mongo failed:", error);
    });
//mongoose.connect()

app.options("*", cors());
app.use(cors());

app.use(express.json());

const consoleBanner = "\n|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||\n\n";

//------------------------------------------------

//PENDIENTES

//chat de un grupo (alumno y profesor)

//------------------------------------------------
//FUNCIONES AUXILIARES

const checkAuth = (req, res, next) => {

    const token = req.get("Authorization").split(" ")[1]; //spliteamos el "Bearer"

    jwt.verify(token, jwtKey, (err, decoded) => {
        if(err) {
            console.error(consoleBanner, err.stack);
            res.status(401).json({ "error": "Auth failed." }); //token inválido o vencido
        }else {
            console.log(consoleBanner, "AUTH OK");
            next();
        }
        return;
    });
};

const accountType = code => {

    if(code==="admin1") {
        return [AdminModel, "codigo", "pass", "admin"];
    }else if(code.length===3 && isNaN(parseInt(code))) {
        return [TeacherModel, "codigo", "pass", "prof"];
    }else if(code.length===4) {
        return [AlumnoModel, "codigotutor", "passtutor", "alumtut"];
    }else {
        return [AlumnoModel, "codigo", "pass", "alumtut"];
    }
};

const getRandomInt = (min, max) => {

    min = Math.ceil(min);
    max = Math.floor(max);

    //The minimum is inclusive and the maximum is exclusive
    let newnum = Math.floor(Math.random() * (max - min) + min);
    return newnum.toString().padStart(3, "0");
}

const invertList = teacherlist => {

    const data = Object.entries(teacherlist);
    const inverted = {};
    let code, materianame;

    for(let i=0; i<10; i++) {

        materianame = data[i][0];
        code = data[i][1].codigo;

        if(code in inverted) {
            inverted[code].push(materianame);
        }else {
            inverted[code] = [materianame]
        }
    }

    return inverted;
};

//------------------------------------------------
//QUERIES AUXILIARES

const getTeacherList = async () => {
    try {
        const result = await TeacherModel.find({},{"codigo":true, "nombre":true, "_id":false});
        const teacherobj = {};
        for(let t of result) {
            teacherobj[t.codigo] = t.nombre;
        }
        return teacherobj;
    }catch(error) {
        console.error(consoleBanner, `GET request for list of teachers. ERROR happened:`, error);
        return false;
    }
};

const getAlumnosFromGrupo = async namegrupo => {

    try {
        const alumnos = await AlumnoModel.find({"grupo":namegrupo});
        if(alumnos) {
            return alumnos;
        }else {
            console.error(consoleBanner, `GET request for alumnos of grupo ${namegrupo}. No alumnos found.`);
            return [];
        }
    }catch(error) {
        console.error(consoleBanner, `GET request for alumnos of grupo ${namegrupo}. ERROR happened:`, error);
        return [];
    }

    return [];
};

const getAlumnosFromGrupoLite = async gruponame => {

    const alumnos = await getAlumnosFromGrupo(gruponame);
    const newalumnos = [];
    let alumnonuevo = null;

    for(let a of alumnos) {
        alumnonuevo = {
            "idalumno" : a._id,
            "nombre"   : a.nombre+" "+a.apellidop+" "+a.apellidom
        };
        newalumnos.push({...alumnonuevo});
    }

    return newalumnos;
};

const groupExists = async namegrupo => {

    try {
        const grupo = await GrupoModel.findOne({"nombre":namegrupo});
        if(grupo) {
            console.log(`ya existe carnal:`, grupo);
            return true;
        }else {
            console.log(`tas libre`);
            return false;
        }
    }catch(error) {
        console.log(`algo tronó como ejote`);
        return null;
    }
};

const getNumCode = async () => {

    let num = getRandomInt(0,1000);

    try {
        const result = await AlumnoModel.findOne({"codigo":num});

        if(result) {
            return false;
        }else {
            return num;
        }
    }catch(error) {
        return false;
    }
};

const getTeacher = async teachercode => {

    try {
        const teacher = await TeacherModel.findOne({"codigo":teachercode});
        if(teacher) {
            //console.log(`encontré profe ${teachercode}:`, teacher);
            return teacher;
        }else {
            console.log(`quién es ese weeeeeeyyyy`);
            return false;
        }
    }catch(error) {
        console.log(`has de estar buscando a un muerto`);
        return false;
    }
};

const updateTeachers = async (gruponame, teacherlist) => {

    const alumnos = await getAlumnosFromGrupoLite(gruponame);

    let curr_prof  = null;
    let new_grupos = null;
    let result     = null;

    const teacheriter = invertList(teacherlist);
    const teachers_pairs = Object.entries(teacheriter);

    for(let i=0; i<teachers_pairs.length; i++) {

        curr_prof = await getTeacher(teachers_pairs[i][0]);
        if(!curr_prof) {
            console.error(consoleBanner, `UPDATE request for grupo ${gruponame} of teacher ${teachers_pairs[i][0]}. Teacher not found.`);
            return false;
        }

        new_grupos = {...curr_prof.grupos};
        new_grupos[gruponame] = {
            "alumnos"  : [...alumnos],
            "materias" : teachers_pairs[i][1]
        };

        try {
            result = await TeacherModel.updateOne({"codigo":teachers_pairs[i][0]}, {$set: {"grupos":new_grupos}});
            console.log(consoleBanner, `UPDATE request for grupo ${gruponame} of teacher ${teachers_pairs[i][0]}. Result:`, result);
        }catch(error) {
            console.error(consoleBanner, `UPDATE request for grupo ${gruponame} of teacher ${teachers_pairs[i][0]}. ERROR happened:`, error);
            return false;
        }
    }

    return true;
};

const addCounter = async (gruponame, materianame, examenname) => {

    try {
        const result = await AlumnoModel.findOne({"grupo":gruponame},{"_id":false, [`exams.${materianame}`]:true});

        const arr = Object.keys(result.exams[materianame]);
        const filtered = arr.filter(e => e.startsWith(examenname));

        if(filtered.length===0) {
            return examenname+1;
        }

        let max = 0;
        let plen, cand;
        const elen = examenname.length;
        for(let pname of filtered) {
            plen = pname.length;
            if(pname.length>elen) {
                cand = pname.slice(elen);
                if(parseInt(cand)>max) {
                    max = parseInt(cand);
                }
            }else if(max===0){
                max = 1;
            }
        }

        return examenname+(max+1);
    }catch(error) {
        console.error(consoleBanner, `No han habido exámenes para esa materia aún.`, error);
        return examenname+1;
    }
}

//------------------------------------------------
//CONSULTAR ALUMNO

app.get("/alumno/:alumnoid", async (req, res) => {

    const alumnoid = req.params.alumnoid;

    try {
        const result = await AlumnoModel.findById(alumnoid);
        if(result) {
            console.log(consoleBanner, `GET request for alumno ${alumnoid}. GET successful:`, result);
            res.status(200).json(result);
            return;
        }else {
            console.error(consoleBanner, `GET request for alumno ${alumnoid}. Alumno not found with provided ID.`);
            res.status(404).json({"message":"ERROR. Alumno no encontrado"});
            return;
        }
    }catch(error) {
        console.error(consoleBanner, `GET request for alumno ${alumnoid}. ERROR happened:`, error);
        res.status(500).json({"message":"ERROR al consultar alumno."});
        return;
    }
});

//------------------------------------------------
//REGISTRAR FALTAS / TAREAS / EXÁMENES

app.post("/faltas/:fecha", async (req, res) => {

    const {fecha} = req.params;
    const faltas = req.body;

    try {
        const result = await AlumnoModel.updateMany({"_id": {$in: faltas}}, {$push: {"faltas":fecha}}, {"new":true});
        console.log(consoleBanner, `POST request for falta. POST successful:`, result);
        res.status(200).json({"message":`Faltas registradas correctamente`});
        return;
    }catch(error) {
        console.error(consoleBanner, `POST request for falta. ERROR happened:`, error);
        res.status(500).json({"message":"ERROR al registrar falta."});
        return;
    }

    return;
});

app.post("/entrega/:tipo/:namegrupo/:materia/:nombre", async (req, res) => {

    let {tipo, namegrupo, materia, nombre} = req.params;
    const grades = req.body; //objeto de la forma {id:calif, id:calif, ...}

    const alumnos = await getAlumnosFromGrupo(namegrupo);

    if(tipo==="exams") {
        nombre = await addCounter(namegrupo, materia, nombre);
    }

    console.log(consoleBanner);

    let alumnoid    = null;
    let entregables = null;
    for(let alumno of alumnos) {

        alumnoid = alumno._id;
        entregables = {...alumno[tipo]};

        if(!entregables.hasOwnProperty(materia)) {
            entregables[materia] = {};
            entregables[materia][nombre] = grades[alumnoid];
        }else if(!entregables[materia].hasOwnProperty(nombre)) {
            entregables[materia][nombre] = grades[alumnoid];
        }else {
            console.log(consoleBanner, `POST request for ${tipo} of grupo ${namegrupo}. ${tipo} already exists.`, error);
            res.status(404).json({"message":`ERROR al crear ${tipo}. Ya existe ${tipo} con nombre ${nombre}`});
            return;
        }

        try {
            let result = await AlumnoModel.updateOne({"_id":alumnoid}, {$set: {[tipo]: entregables}}, {"new":true});
            console.log(`POST request for ${tipo} of grupo ${namegrupo}. POST successful:`, JSON.stringify(result));
        }catch(error) {
            console.error(consoleBanner, `POST request for ${tipo} of grupo ${namegrupo}. ERROR happened:`, error);
            res.status(500).json({"message":`ERROR al crear ${tipo}.`});
            return;
        }
    }

    res.status(200).json({"message":`${tipo} de grupo ${namegrupo} creado exitosamente.`});
    return;
});

//------------------------------------------------
//CALIFICAR PROFESOR

app.patch("/rating/:idgrupo/:codealumno", async (req, res) => {

    const {idgrupo, codealumno} = req.params;
    const ratings = req.body;

    try {

        const getresult = await GrupoModel.findById(idgrupo);

        if(getresult) {

            const newmaterias  = {...getresult.materias};
            const materias_arr = Object.keys(ratings);

            for(let m of materias_arr) {
                if(newmaterias[m]) {
                    if(!newmaterias[m].rating) {
                        newmaterias[m].rating = {};
                    }
                    newmaterias[m].rating[codealumno] = ratings[m];
                }else {
                    console.error(consoleBanner, `PATCH request for rating of grupo ${idgrupo} by alumno ${codealumno}. ERROR happened:`, error);
                    res.status(404).json({"message":`ERROR al calificar la materia ${m}. La materia no existe en el grupo ${idgrupo}.`});
                    return;
                }
            }

            try {
                const patchresult = await GrupoModel.updateOne({"_id":idgrupo}, {$set: {"materias":newmaterias}}, {"new":true});
                console.log(consoleBanner, `PATCH request for rating of grupo ${idgrupo} by alumno ${codealumno}. PATCH successful:`, JSON.stringify(patchresult));
                res.status(200).json(patchresult);
                return;
            }catch(error) {
                console.error(consoleBanner, `PATCH request for rating of grupo ${idgrupo} by alumno ${codealumno}. ERROR happened:`, error);
                res.status(500).json({"message":`ERROR al calificar profesor. ${error}`});
                return;
            }
        }else {
            console.error(consoleBanner, `GET request for grupo ${idgrupo}. ERROR happened:`, error);
            res.status(404).json({"message":`ERROR al consultar grupo. El grupo ${idgrupo} no existe.`});
            return;
        }
    }catch(error) {
        console.error(consoleBanner, `GET request for grupo ${idgrupo}. ERROR happened:`, error);
        res.status(500).json({"message":"ERROR al consultar grupo."});
        return;
    }

    return;
});

//------------------------------------------------
//ALTA DE ALUMNO

app.post("/alumnos", async (req, res) => {

    const {nombre, apellidop, apellidom, tutor, sexo, emailtutor, grupo} = req.body;

    const existing = await getAlumnosFromGrupo("1"+grupo);
    if(existing.length>=20) {
        console.error(consoleBanner, `POST request for alumno. ERROR. Group ${"1"+grupo} is already full.`);
        res.status(404).json({"message":`ERROR. El grupo ${"1"+grupo} ya está lleno.`});
        return;
    }

    let available = false;
    while(!available) {
        available = await getNumCode();
    }

    try {
        hash1 = await bcrypt.hash("holamundo", 10);
        hash2 = await bcrypt.hash("holamundo", 10);
    }catch(err) {
        console.error(consoleBanner, "ERROR al hashear nueva contraseña:", err);
        res.status(401).json({"message":"New password failed."});
        return;
    }

    const newalumno = {
        "_id"         : new mongoose.Types.ObjectId(),
        "nombre"      : nombre,
        "apellidop"   : apellidop,
        "apellidom"   : apellidom,
        "tutor"       : tutor,
        "sexo"        : sexo,
        "emailtutor"  : emailtutor,
        "codigo"      : available,
        "codigotutor" : available+"t",
        "pass"        : hash1,
        "passtutor"   : hash2,
        "grado"       : "1",
        "grupo"       : "1"+grupo,
        "calif"       : {},
        "tareas"      : {},
        "exams"       : {},
        "faltas"      : []
    };

    const doc = new AlumnoModel(newalumno);

    try {
        const result = await doc.save();
        console.log(consoleBanner, `POST request for alumno ${available}. POST successful:`, JSON.stringify(result));
        res.status(200).json({"message":`Nuevo alumno ${available} creado exitosamente.`});
        return;
    }catch(error) {
        console.error(consoleBanner, "POST request for alumno. ERROR happened:", error);
        res.status(500).json({"message":"ERROR al crear nuevo alumno."});
        return;
    }

    return;
});

//------------------------------------------------
//ALTA / BAJA DE GRUPO

app.post("/grupos/:nombregrupo", async (req, res) => {

    //id, nombre, grado, materias
    const {nombregrupo} = req.params;
    const materias = req.body;

    if(await groupExists(nombregrupo)) {
        console.log(consoleBanner, `POST request for new grupo ${nombregrupo}. Grupo already exists.`);
        res.status(400).json({"message":`ERROR. El grupo ${nombregrupo} ya existe. Favor de eliminarlo primero.`});
        return;
    }

    const udt = await updateTeachers(nombregrupo, materias);

    if(!udt) {
        res.status(500).json({"message":"ERROR al actualizar profesores."});
        return;
    }

    const newgrupo = {
        "_id"      : new mongoose.Types.ObjectId(),
        "nombre"   : nombregrupo,
        "grado"    : parseInt(nombregrupo.slice(0,1)),
        "materias" : {...materias}
    };

    const doc = new GrupoModel(newgrupo);
    const validerr = doc.validateSync();
    if(!!validerr) {
        console.log(consoleBanner, `POST request for new grupo ${nombregrupo}. New grupo is not valid:`, validerr);
        res.status(400).json({"message":"ERROR. El nuevo grupo no es válido: " + validerr.message});
        return;
    }

    doc.save()
        .then(result => {
            console.log(consoleBanner, `POST request for new grupo ${nombregrupo}. POST successful:`, JSON.stringify(result));
            res.status(200).json({"message":`Nuevo grupo ${nombregrupo} creado exitosamente.`});
            return;
        })
        .catch(error => {
            console.error(consoleBanner, `POST request for new grupo ${nombregrupo}. ERROR happened:`, error);
            res.status(500).json({"message":"ERROR al crear nuevo grupo."});
            return;
        });
    //doc.save()
});

app.delete("/grupos/:idgrupo", async (req, res) => {

    const idgrupo = req.params.idgrupo;

    GrupoModel.findByIdAndDelete(idgrupo)
        .then(result => {
            console.log(consoleBanner, `DELETE request for grupo ${idgrupo}. DELETE successful:`, JSON.stringify(result));
            res.status(200).json({"message":`Grupo ${idgrupo} eliminado exitosamente.`});
            return;
        })
        .catch(error => {
            console.error(consoleBanner, `DELETE request for grupo ${idgrupo}. ERROR happened:`, error);
            res.status(500).json({"message":"ERROR al eliminar grupo."});
            return;
        });
    //GrupoModel.findByIdAndDelete(idgrupo)

    return;
});

//------------------------------------------------
//LOGIN

app.post("/login", async (req, res) => {

    const {code, pass} = req.body;
    const [collectionmodel, field, passfield, tipo] = accountType(code);

    try {

        let user = await collectionmodel.findOne({ [field]: code });

        if(user) {

            user = {...user._doc}; //sacar el documento (de mongo) del objeto user

            if(tipo==="admin") {
                user["teachers"] = await getTeacherList();
                if(!user.teachers) {
                    console.error("Couldn't get list of teachers");
                    res.status(401).json({ "error": "Auth failed." }); //en realidad es error 500
                    return;
                }
            }

            try {

                const result = await bcrypt.compare(pass, user[passfield]);

                if(result) {

                    const jwtPayload = {
                        "code": user[field],
                        "id": user._id
                    }

                    const jwtConfig = { "expiresIn": "1h" };

                    jwt.sign(jwtPayload, jwtKey, jwtConfig, (err, token) => {

                        if(!err) {
                            console.log("Login exitoso.");
                            res.status(200).json({ "result":"Login Exitoso.", "token":token, "userdata":user, "type":tipo });
                            return;
                        }else {
                            console.error(err.stack);
                            res.status(401).json({ "error": "Auth failed." }); //en realidad es error 500
                            return;
                        }
                    });
                }else {
                    console.log("Contraseña incorrecta.");
                    res.status(401).json({ "error": "Wrong password." });
                    return;
                }
            }catch(err) {
                console.error(err.stack);
                res.status(401).json({ "error": "Auth failed." }); //en realidad es error 500
                return;
            }
        }else {
            console.log("No hay usuarios con ese código.");
            res.status(401).json({ "error": "User not found." });
            return;
        }
    }catch(err) {
        console.error(err.stack);
        res.status(401).json({ "error": "Auth failed." }); //en realidad es error 500
        return;
    }
});

//------------------------------------------------
//CAMBIAR CONTRASEÑAS

app.patch("/changepass", checkAuth, async (req, res) => {

    const {type, accountid, newpass} = req.body;
    let hash = null;

    try {
        hash = await bcrypt.hash(newpass, 10);
    }catch(err) {
        console.error(consoleBanner, "ERROR al hashear nueva contraseña:", err);
        res.status(401).json({"message":"New password failed."});
        return;
    }

    let updates = {};
    let passModel = null;
    if(type==="alumno") {
        updates = {"pass": hash};
        passModel = AlumnoModel;
    }else if(type==="tutor") {
        updates = {"passtutor": hash};
        passModel = AlumnoModel;
    }else if(type==="profesor") {
        updates = {"pass": hash};
        passModel = TeacherModel;
    }else if(type==="admin") {
        updates = {"pass": hash};
        passModel = AdminModel;
    }

    passModel.findByIdAndUpdate({"_id": new mongoose.Types.ObjectId(accountid)}, {$set: updates}, {"new":true})
        .then(result => {
            console.log(consoleBanner, `PATCH request for new pass of ${type} ${accountid}. PATCH successful:`, JSON.stringify(result));
            res.status(200).json({"message":`Contraseña del ${type} ${accountid} cambiada exitosamente.`});
            return;
        })
        .catch(error => {
            console.error(consoleBanner, `PATCH request for new pass of ${type} ${accountid}. ERROR happened:`, error);
            res.status(500).json({"message":"ERROR al cambiar contraseña."});
            return;
        });
    //passModel.findByIdAndUpdate

    return;
});

app.patch("/bulkpass", async (req, res) => {

    return;

    newpass = "holamundo";
    accountids = req.body.ids;
    let hash1 = null;
    let hash2 = null;

    for(let alumno of accountids) {

        try {
            hash1 = await bcrypt.hash(newpass, 10);
            hash2 = await bcrypt.hash(newpass, 10);
        }catch(err) {
            console.error(consoleBanner, "ERROR al hashear nueva contraseña:", err);
            res.status(401).json({"message":"New password failed."});
            return;
        }

        let updates = {
            "pass"      : hash1,
            "passtutor" : hash2
        };

        AlumnoModel.findByIdAndUpdate({"_id": new mongoose.Types.ObjectId(alumno)}, {$set: updates}, {"new":true})
            .then(result => {
                console.log(`PATCH request for new pass of alumno ${alumno}. PATCH successful:`, JSON.stringify(result));
            })
            .catch(error => {
                console.error(`PATCH request for new pass of alumno ${alumno}. ERROR happened:`, error);
            });
        //AlumnoModel.findByIdAndUpdate
    }

    res.status(200).json({"message":`Proceso Terminado.`});
    return;
});

//------------------------------------------------

app.get("/testauth", checkAuth, (req, res) => {
    res.status(200).json({"message":"¡Bienvenid@!"});
});

app.get("/ping", (req, res) => {
    res.status(200).json({"message":"I'm awake!"});
});

app.all("*", (req, res) => {
    res.status(200).send("¡Hola Mundo! ¡Bienvenid@ a la API de SCO21!");
});

//------------------------------------------------

app.listen(port, () => {
    console.log(consoleBanner, `Escuchando el puerto ${port}...`);
});

//eof
