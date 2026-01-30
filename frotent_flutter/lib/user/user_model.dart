class UserModel {
  int id;
  String username;
  String role;
  String nomeCompleto;
  String cargo;
  bool isActive;
  int unitId;

  UserModel({
    required this.id,
    required this.username,
    required this.role,
    required this.nomeCompleto,
    required this.cargo,
    required this.isActive,
    required this.unitId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      username: json['username'],
      role: json['role'],
      nomeCompleto: json['nome_completo'],
      cargo: json['cargo'],
      isActive: json['is_active'],
      unitId: json['unit_id'],
    );
  }
}

/*
  id: user.id,
  username: user.username,
  role: user.role,
  nome_completo: user.nome_completo,
  cargo: user.cargo,
  is_active: user.is_active,
  unit_id: user.unit_id
}*/
