import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganizerLoginComponent } from './organizer-login-component';

describe('OrganizerLoginComponent', () => {
  let component: OrganizerLoginComponent;
  let fixture: ComponentFixture<OrganizerLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizerLoginComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizerLoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
