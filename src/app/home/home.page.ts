import { Component, OnInit } from '@angular/core';
import { Health } from '@ionic-native/health/ngx';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { EmailComposer, EmailComposerOptions } from '@ionic-native/email-composer/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  records = [];
  meals: any[] = [];
  unit = 'mmol/L'
  constructor(
    private health: Health,
    private platform: Platform,
    private emailComposer: EmailComposer,
    private storage: Storage,
    public alertController: AlertController,
    public loadingController: LoadingController,
  ) {
    this.getAllRecords();
    // this.platform.ready().then(() => {
    //   this.askForAuth()
    // });
  }

  askForAuth() {
    this.health.isAvailable().then((available: boolean) => {
      console.log(available);
      this.health.requestAuthorization([
        'distance', 'nutrition', 'height', 'blood_glucose', 'weight', 'blood_pressure', 'steps'
      ]).then(res => {
        console.log(res);
        this.askGoogleFit()
      })
        .catch(e => console.log(e));
    }).catch(e => console.log(e));
  }

  async askGoogleFit() {
    let requestedData = {
      startDate: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      dataType: 'blood_glucose',
      limit: 1000
    };
    const loading = await this.loadingController.create({
      message: 'Loading...',
      translucent: true
    });
    await loading.present();

    this.health.query(requestedData).then(async (data) => {
      await loading.dismiss()
      this.handleData(data)
    })
      .catch(async (e) => {
        await loading.dismiss()
        console.log(e);
      })
  }

  handleData(data) {
    console.log(data);
  }

  async addLevel() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'New Glucose level',
      inputs: [
        {
          name: 'level',
          type: 'number',
          placeholder: 'Glucose level (mmol/L)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (res) => {
            this.saveRecord(res.level)
          }
        }
      ]
    });

    await alert.present();
  }

  async askReceiverEmail() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Email data to a doctor',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Doctor E-mail'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (res) => {
            this.senEmail(res.email)
          }
        }
      ]
    });

    await alert.present();
  }


  senEmail(email: string) {
    let body = '';
    for (const r of this.records) {
      let foramt = r.date.toLocaleString()
      body = '<h6> Glucose Level :' + r.glucose + '  ' + this.unit + ' AT ' + foramt + '</h6> "<br/>'
    }



    let mail: EmailComposerOptions = {
      to: email,
      subject: 'glucose level in blood',
      body: body,
      isHtml: true
    }
    this.emailComposer.open(mail);

  }

  async addMeal(record: any) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'New Meal',
      inputs: [
        {
          name: 'meal',
          type: 'text',
          placeholder: 'Meal name'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (res) => {
            this.newMeal(record, res.meal)
          }
        }
      ]
    });

    await alert.present();
  }

  async askUnit() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Choose Unit',
      inputs: [
        {
          type: 'radio',
          label: 'mmol/L',
          value: 'mmol/L'
        },
        {
          type: 'radio',
          label: 'mg/dL',
          value: 'mg/dL'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Ok',
          handler: (res) => {
            this.setUnit(res)
          }
        }
      ]
    });

    await alert.present();
  }


  setUnit(unit: string) {
    console.log(unit);
    if (unit == 'mg/dL' && unit != this.unit) {
      this.unit = unit
      for (const r of this.records) {
        r.glucose = r.glucose * 18.01559
      }

    } else if (unit == 'mmol/L' && unit != this.unit) {
      this.unit = unit
      for (const r of this.records) {
        r.glucose = r.glucose / 18.01559
      }
    }
  }

  async store(gLevel: number) {
    let value: string = gLevel.toString()
    const loading = await this.loadingController.create({
      message: 'Saving data...',
      translucent: true
    });
    await loading.present();
    this.health.store({
      startDate: new Date(new Date().getTime() - 3 * 60 * 1000), // three minutes ago
      endDate: new Date(),
      dataType: 'blood_glucose',
      value: { glucose: value, meal: 'breakfast', sleep: 'fully_awake', source: 'capillary_blood' },
      sourceBundleId: '',
      sourceName: ''
    }).then(async (data) => {
      await loading.dismiss()
      this.askGoogleFit();
    })
      .catch(async (e) => {
        await loading.dismiss()
        console.log(e);
      })
  }



  getAllRecords() {
    this.storage.get('records').then(user => {
      this.records = user;
    })
  }

  saveRecord(gLevel) {
    let record: any = {
      glucose: gLevel,
      meals: [],
      date: new Date(),
      id: new Date().getTime()
    }
    this.records = this.records || [];
    this.records.push(record);

    this.storage.set('records', this.records);


  }

  newMeal(record: any, meal: string) {
    let pos = this.records.findIndex(item => { item.d == record.id });
    record.meals.push(meal);
    this.records[pos] = record;
    this.storage.set('records', this.records);
  }

  getClassOf(val) {
    if (this.unit == 'mmol/L') {
      if (val >= 0 && val <= 5.5) {
        return 'g-color';
      } else if (val > 5.5 && val <= 6.5) {
        return 'w-color';
      } else {
        return 'r-color'
      }
    }
    else {
      val = val / 18.01559
      if (val >= 0 && val <= 5.5) {
        return 'g-color';
      } else if (val > 5.5 && val <= 6.5) {
        return 'w-color';
      } else {
        return 'r-color'
      }
    }
  }
  getClassOflabel(val) {
    if (this.unit == 'mmol/L') {
      if (val >= 0 && val <= 5.5) {
        return 'gre';
      } else if (val > 5.5 && val <= 6.5) {
        return 'war';
      } else {
        return 'red'
      }
    }
    else {
      val = val / 18.01559
      if (val >= 0 && val <= 5.5) {
        return 'gre';
      } else if (val > 5.5 && val <= 6.5) {
        return 'war';
      } else {
        return 'red'
      }
    }
  }

}
