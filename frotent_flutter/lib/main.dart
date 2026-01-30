import 'package:flutter/material.dart';
import 'package:frotent_flutter/login/login_view.dart';

void main() {
  //inicialização de classes globais aq??
  //classe global de autenticação que ficaria responsável por manter o estado do login e do usuário
  //que alimentaria um goRouter para redirecionar a tela de
  // login em casos especificos (não logado, logout ou token expirado)

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: LoginView(),
    );
  }
}
