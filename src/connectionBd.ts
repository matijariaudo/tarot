import mongoose from 'mongoose';

const connectDB = async () => {
  console.log("Comenzando conexión")
  try {
    await mongoose.connect('mongodb+srv://user_mati:KkfzLEOHeHLbxEZm@clustercursonode.lnl88zd.mongodb.net/app_final', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conexión a MongoDB establecida');
  } catch (error) {
    console.error('Error al conectar a MongoDB', error);
    process.exit(1); // Salir de la aplicación en caso de error de conexión
  }
};

export default connectDB;
