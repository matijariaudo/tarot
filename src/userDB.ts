import mongoose, { Schema, Document } from 'mongoose';

// Define la interfaz del documento de usuario
export interface IUser extends Document {
  nombre: string;
  apellido: string;
  password: string;
  fechaNacimiento: Date;
  telefono: string;
  email: string;
  status: boolean;
}

// Define el schema de usuario
const userSchema = new Schema<IUser>({
  nombre: {
    type: String,
    required: true,
  },
  apellido: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6, // Longitud mínima de la contraseña
    select: false,
  },
  fechaNacimiento: {
    type: Date,
    required: true
  },
  telefono: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // El correo electrónico debe ser único en la base de datos
  },
  status:{
    type : Boolean ,
    required:true,
    default:true
  }
});

// Crea y exporta el modelo de usuario
const UserModel = mongoose.model<IUser>('User', userSchema);

export default UserModel;
