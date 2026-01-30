import 'package:frotent_flutter/user/user_model.dart';

class AuthStore {
  UserModel? user;
  bool hasUser = false;

  static final AuthStore instance = AuthStore._internal();

  AuthStore._internal();

  factory AuthStore() {
    return instance;
  }

  Future<void> autenticate() async {
    //verificar com o banco o token armazenado
  }

  Future<void> signIn(UserModel loggedUser) async {
    user = loggedUser;
  }

  Future<void> signOut() async {
    user = null;
  }
}
