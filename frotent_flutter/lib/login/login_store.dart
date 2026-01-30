import 'package:flutter/cupertino.dart';
import 'package:frotent_flutter/api/dio_client.dart';
import 'package:frotent_flutter/login/login_repository.dart';
//import 'package:frotent_flutter/user/user_model.dart';

enum LoginState { idle, loading, success, error }

class LoginStore {
  final LoginRepository repository = LoginRepository(DioClient().dio);
  final state = ValueNotifier<LoginState>(LoginState.idle);
  final errorMessage = ValueNotifier<String>('');
  //final ValueNotifier<UserModel?> loggedUser = ValueNotifier<UserModel?>(null);

  Future<void> signIn(String username, String password) async {
    if (username.isEmpty || password.isEmpty) {
      state.value = LoginState.error;
      errorMessage.value = 'Preencha a senha e usuário';
    }

    state.value = LoginState.loading;

    try {
      final user = await repository.login(username, password);
      // ignore: avoid_print
      print(user);
      //loggedUser.value = user;

      state.value = LoginState.success;
    } catch (error) {
      state.value = LoginState.error;
      errorMessage.value = error.toString();
    }

    //se login foi bem sucedido armazenar token e direcionar para tela principal
  }
}
