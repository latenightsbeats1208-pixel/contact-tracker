; ============================================================================
; Contact Tracker — script Inno Setup 6
;
; Fichier en UTF-8 AVEC BOM (Inno Setup 6 Unicode) : les textes affichés à
; l'utilisateur portent leurs accents tels quels.
;
; Installation PAR UTILISATEUR (PrivilegesRequired=lowest) : aucune élévation
; administrateur, l'application va dans %LOCALAPPDATA%\Programs\ContactTracker.
;
; Les données utilisateur vivent dans %LOCALAPPDATA%\ContactTracker, en dehors
; du répertoire d'installation : la désinstallation les CONSERVE.
;
; Compilé par installer/build.mjs, qui passe la version et la charge utile :
;   ISCC.exe /DMyAppVersion=1.0.0 /DPayloadDir=...\dist\ContactTracker ContactTracker.iss
; ============================================================================

#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif
#ifndef PayloadDir
  #define PayloadDir "dist\ContactTracker"
#endif
#ifndef OutDir
  #define OutDir "output"
#endif

#define MyAppName "Contact Tracker"
#define MyAppDirName "ContactTracker"
#define MyAppPublisher "Contact Tracker"
#define MyAppLauncher "ContactTracker.bat"
#define MyAppIcon "contact-tracker.ico"
#define MyDataDirName "ContactTracker"

[Setup]
AppId={{5C1E7A3D-2B84-4F0E-9A6D-7E3B1C2D4F58}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
VersionInfoVersion={#MyAppVersion}
DefaultDirName={localappdata}\Programs\{#MyAppDirName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
AllowNoIcons=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutDir}
OutputBaseFilename=ContactTracker_Setup_{#MyAppVersion}
SetupIconFile={#PayloadDir}\{#MyAppIcon}
UninstallDisplayIcon={app}\{#MyAppIcon}
UninstallDisplayName={#MyAppName} {#MyAppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; Le serveur (node.exe) peut tourner pendant une mise à jour : Inno propose
; de fermer les programmes qui verrouillent des fichiers plutôt que d'échouer.
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
french.DataKept=Vos données (%1) sont conservées. Supprimez ce dossier à la main si vous n'en voulez plus.
english.DataKept=Your data (%1) has been kept. Delete that folder manually if you no longer want it.
french.ReadMe=Lire LISEZ-MOI.txt
english.ReadMe=Read LISEZ-MOI.txt

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppLauncher}"; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppIcon}"; Comment: "Ouvre {#MyAppName} dans le navigateur"
Name: "{group}\{cm:ReadMe}"; Filename: "{app}\LISEZ-MOI.txt"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppLauncher}"; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppIcon}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppLauncher}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent shellexec

[UninstallDelete]
; Uniquement les artefacts d'exécution écrits dans le répertoire d'installation.
Type: filesandordirs; Name: "{app}\app\.next\cache"
Type: dirifempty; Name: "{app}"

[Code]
function UserDataDir(): String;
begin
  Result := ExpandConstant('{localappdata}\{#MyDataDirName}');
end;

// La désinstallation ne touche JAMAIS aux données : on se contente de
// rappeler où elles sont (message supprimé en mode silencieux).
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    if DirExists(UserDataDir()) then
      SuppressibleMsgBox(FmtMessage(CustomMessage('DataKept'), [UserDataDir()]),
        mbInformation, MB_OK, IDOK);
  end;
end;
