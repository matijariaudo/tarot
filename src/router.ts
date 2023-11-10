import express, { Request, Response } from 'express';
import UserModel,{IUser} from './userDB';
import { body} from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import https from 'https';
import { hashPassword, validatePassword } from './crypt';
import { generateJWT } from './jwt';
import * as dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Middleware de validación de datos para el alta de usuario
const validateUserData = [
  body('nombre').notEmpty().isString(),
  body('apellido').notEmpty().isString(),
  body('password').notEmpty().isString().isLength({ min: 6 }).matches(/[!@#$%^&*(),.?":{}|<>]/),
  body('fechaNacimiento').notEmpty().isISO8601(),
  body('telefono').notEmpty().isString(),
  body('email').notEmpty().isEmail(),
];

// Ruta para crear un nuevo usuario (Alta)
router.post('/alta', validateUserData, async (req: Request, res: Response) => {
  try {
    const userData = req.body as IUser;
    userData.password=await hashPassword(userData.password);
    const newUser = new UserModel(userData);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el usuario',error});
  }
});

// Ruta para obtener todos los usuarios
router.get('/', async (req: Request, res: Response) => {
  const status= req.body.status||true;
  console.log("buscando todos")
  try {
    const users = await UserModel.find({status});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los usuarios' });
  }
});

// Ruta para actualizar un usuario por ID (Modificación)
router.put('/:id', validateUserData, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const updatedUserData = req.body as IUser;
    if(updatedUserData.password){updatedUserData.password=await hashPassword(updatedUserData.password);}
    console.log(updatedUserData)
    const updatedUser = await UserModel.findByIdAndUpdate(userId, updatedUserData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el usuario',error });
  }
});

router.post('/session', async (req, res) => {
  const { email , password }:{email:string,password:string}= req.body;
  try {
    // Busca un usuario por su dirección de correo electrónico
    const user = await UserModel.findOne({ email }).select('+password');
    console.log(user)
    if (!user) {return res.status(404).json({ error: 'Usuario no encontrado' });}
    const cont=await validatePassword(password,user.password);
    // Verifica la contraseña (debes implementar la lógica de hash y comparación de contraseñas)
    if (!cont) {return res.status(401).json({ error: 'Contraseña incorrecta' });}
    //genero token
    const token=await generateJWT({"id":user._id},'MATIAS','1h');
    
    // Iniciar sesión con éxito, puedes generar un token JWT aquí si es necesario
    return res.status(200).json({ message: 'Inicio de sesión exitoso', user,token });
    
  } catch (error) {
  
    return res.status(500).json({error});
  
  }
});


// Ruta para eliminar un usuario por ID (Baja)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const deletedUser = await UserModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(deletedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el usuario' });
  }
});

router.post('/google',async(req:Request,res:Response)=>{
  console.log(req.body)
  const oauth: boolean= req.body.oauth || false;
  const token=req.body.id_token;
  if(oauth){
        const options = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        };
        console.log(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
        // Realiza la solicitud HTTPS
        const req = https.request(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`, options, (res1) => {
          let data = '';
          // Escucha el evento 'data' para recibir los datos de la respuesta
          res1.on('data', (chunk) => {
            data += chunk;
          });

          // Escucha el evento 'end' para finalizar la solicitud
          res1.on('end', async() => {
            try {
              const jsonData = JSON.parse(data);
              console.log('Datos obtenidos:', jsonData);
              let user = await UserModel.findOne({ email:jsonData.email }) as IUser;
              let message: string='Se ha iniciado sesión';
              if (!user) {
                const userData = {} as IUser;
                userData.email=jsonData.email;
                userData.telefono="";
                userData.nombre=jsonData.given_name;;
                userData.apellido=jsonData.family_name;
                userData.password="no_password";
                userData.telefono="no_phone";
                userData.fechaNacimiento=new Date();
                const newUser = new UserModel(userData);
                await newUser.save();
                user = await UserModel.findOne({ email:jsonData.email }) as IUser;
                message='Se ha creado nuevo usuario';
              }
              //genero token
              const newtoken=await generateJWT({"id":user._id},'MATIAS','1h');
              // Iniciar sesión con éxito, puedes generar un token JWT aquí si es necesario
              return res.status(200).json({ message, user,token:newtoken});
            } catch (error) {
              console.error('Error al analizar los datos JSON:', error);
              return res.status(200).json({ data: "error", error }); // Devuelve un mensaje de error JSON aquí
            }
          });
        });
        req.on('error', (error) => {
          console.error('Error en la solicitud:', error);
          return res.status(200).json({ data: "error", error }); // Devuelve un mensaje de error JSON aquí
        });
        
        // Finaliza la solicitud
        req.end();   
      
  }else{
    const client = new OAuth2Client();
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_ID_CLIENTE,  // Specify the CLIENT_ID of the app that accesses the backend
      });
      console.log("payload",ticket)
      const jsonData:any = ticket.getPayload();
      console.log(jsonData)
      let user = await UserModel.findOne({ email:jsonData.email }) as IUser;
      let message: string='Se ha iniciado sesión';
      if (!user) {
        const userData = {} as IUser;
        userData.email=jsonData.email;
        userData.telefono="";
        userData.nombre=jsonData.given_name;;
        userData.apellido=jsonData.family_name;
        userData.password="no_password";
        userData.telefono="no_phone";
        userData.fechaNacimiento=new Date();
        const newUser = new UserModel(userData);
        await newUser.save();
        user = await UserModel.findOne({ email:jsonData.email }) as IUser;
        message='Se ha creado nuevo usuario';
      }
      //genero token
      const newtoken=await generateJWT({"id":user._id},'MATIAS','1h');
      // Iniciar sesión con éxito, puedes generar un token JWT aquí si es necesario
      return res.status(200).json({ message, user,token:newtoken});
    } catch (error) {
      return res.status(200).json({'data':"error",error})
    }
  }
});

export default router;
