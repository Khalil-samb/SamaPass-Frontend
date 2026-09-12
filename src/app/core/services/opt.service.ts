import { Injectable } from "@angular/core";
import { Observable, of, delay } from "rxjs";



const MOCK_CODE ='1234';

@Injectable({providedIn: 'root'})
export class OtpService {


  // "async" veut dire : cette fonction met du temps à répondre
  // "Promise<void>": elle ne renvoie rien de précis, juste c'est fait.
  async sendCode(phone: string): Promise<void>{
    console.log(`[TEST] Code envoyé au ${phone} : ${MOCK_CODE}`);


    // On attend 500 milliseconde, avant d'envoyer le code
    await this.attendre(500);
  }


  //Vérifie si le code tapé par l'utilisateur est le bon.
  async verifyCode(phone: string, code: string): Promise<boolean>{
    await this.attendre(400);
    return code === MOCK_CODE;
  }

  //petite fonction qui met le programme en pause pendant X millisecondes.
  private attendre(millisecondes: number): Promise<void>{
    return new Promise((resolve)=> setTimeout(resolve, 2000));
  }
}
